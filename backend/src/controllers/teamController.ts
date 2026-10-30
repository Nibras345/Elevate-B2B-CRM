import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Invitation } from '../models/Invitation';
import { Tenant } from '../models/Tenant';
import { Notification } from '../models/Notification';
import { AuthRequest } from '../types';
import { sendInvitationEmail } from '../utils/emailService';
import { getTenantContext } from '../utils/tenantHelper';

/**
 * @route   POST /api/team/invite
 * @desc    Invite a new or existing user to the current tenant workspace
 * @access  Private (JWT Protected, Company Admin / Super Admin)
 */
export const inviteTeamMember = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, role, department } = req.body;
    const currentTenantId = req.user?.tenantId;

    if (!currentTenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant context is missing. Please re-authenticate.',
      });
      return;
    }

    // Role check: Only Company Admin or Super Admin can invite members
    if (req.user?.role !== 'Company Admin' && req.user?.role !== 'Super Admin') {
      res.status(403).json({
        success: false,
        message: 'Access Denied: Only Company Admins can invite team members.',
      });
      return;
    }

    // Email validation
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({
        success: false,
        message: 'A valid email address is required.',
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const assignedRole = role || 'Sales Agent';
    const assignedDepartment = department?.trim() || 'General';

    // 1. Check if user already exists in User model
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      // Check if user is already a member of the current tenant workspace
      const isAlreadyMember =
        existingUser.tenantId === currentTenantId ||
        existingUser.tenantIds?.includes(currentTenantId) ||
        existingUser.workspaces?.some((w) => w.tenantId === currentTenantId);

      if (isAlreadyMember) {
        res.status(400).json({
          success: false,
          message: 'User is already a member of your workspace.',
        });
        return;
      }
      // If user exists but is NOT in this workspace, proceed with invitation (multi-tenant support)
    }

    // 2. Enforce Workspace Seat Limit
    const tenantDoc = await Tenant.findOne({ tenantId: currentTenantId });
    const maxSeats = tenantDoc?.maxSeats ?? 25;

    const activeUsersCount = await User.countDocuments({
      $or: [
        { tenantId: currentTenantId },
        { tenantIds: currentTenantId },
        { 'workspaces.tenantId': currentTenantId },
      ],
      isActive: { $ne: false },
    });

    const pendingInvitesCount = await Invitation.countDocuments({
      tenantId: currentTenantId,
      email: { $ne: normalizedEmail },
    });

    if (activeUsersCount + pendingInvitesCount >= maxSeats) {
      res.status(400).json({
        success: false,
        message: 'Seat limit reached. Please upgrade your plan.',
      });
      return;
    }

    // 3. Generate a secure crypto token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days expiration

    // 3. Check if there's an existing pending invitation for this email in this tenant
    // (Prevents duplicate invite records for the same workspace while refreshing the token)
    let invitation = await Invitation.findOne({
      email: normalizedEmail,
      tenantId: currentTenantId,
    });

    if (invitation) {
      // Refresh token, role, department, and expiration
      invitation.token = token;
      invitation.role = assignedRole;
      invitation.department = assignedDepartment;
      invitation.expiresAt = expiresAt;
      invitation.invitedBy = req.user?._id as any;
      await invitation.save();
    } else {
      // Find tenant ObjectId if available
      const tenantDoc = await Tenant.findOne({ tenantId: currentTenantId });

      invitation = await Invitation.create({
        email: normalizedEmail,
        tenantId: currentTenantId,
        tenant: tenantDoc?._id || undefined,
        role: assignedRole,
        department: assignedDepartment,
        token,
        expiresAt,
        invitedBy: req.user?._id as any,
      });
    }

    // Create Notification record for this tenant
    try {
      const tenantObjId =
        invitation.tenant ||
        (tenantDoc ? tenantDoc._id : null) ||
        (mongoose.isValidObjectId(currentTenantId) ? new mongoose.Types.ObjectId(currentTenantId) : null);

      if (tenantObjId) {
        await Notification.create({
          tenantId: tenantObjId,
          tenantCode: currentTenantId,
          title: 'Invite Sent',
          message: `Invitation sent to ${normalizedEmail}`,
          type: 'INVITE_SENT',
          isRead: false,
        });
      }
    } catch (notifError) {
      console.error('[Notification Creation Error - inviteTeamMember]:', notifError);
    }

    // 4. Construct invitation link
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const inviteLink = `${clientUrl}/invite/accept/${token}`;

    // 5. Send invitation email via Nodemailer
    const companyName = req.user?.companyName || 'Enterprise Workspace';
    const senderName = req.user?.name || req.user?.fullName || 'Workspace Administrator';

    try {
      await sendInvitationEmail(
        normalizedEmail,
        inviteLink,
        assignedRole,
        assignedDepartment,
        companyName,
        senderName
      );
    } catch (emailError: any) {
      console.error('[Nodemailer Invitation Error]:', emailError);
      // Still return success with link if mail delivery encounters transient network issue
      res.status(201).json({
        success: true,
        message: `Invitation record created, but email delivery encountered an issue: ${emailError.message}. Invitation link: ${inviteLink}`,
        inviteLink,
        invitation,
      });
      return;
    }

    res.status(201).json({
      success: true,
      message: `Invitation successfully sent to ${normalizedEmail}.`,
      inviteLink,
      invitation: {
        id: invitation._id,
        email: invitation.email,
        role: invitation.role,
        department: invitation.department,
        token: invitation.token,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * @route   GET /api/team
 * @desc    Fetch all team members (Active Users + Pending Invitations) for the tenant
 * @access  Private (JWT Protected)
 */
export const getTeamMembers = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const currentTenantId = req.user?.tenantId;

    if (!currentTenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant context is required.',
      });
      return;
    }

    // Resolve tenant ObjectId and Code for strict tenant isolation in MongoDB queries
    let tenantObjectId: mongoose.Types.ObjectId | null = null;
    let tenantCode = currentTenantId;

    try {
      const context = await getTenantContext(req);
      tenantObjectId = context.tenantObjectId;
      tenantCode = context.tenantCode;
    } catch {
      if (mongoose.isValidObjectId(currentTenantId)) {
        tenantObjectId = new mongoose.Types.ObjectId(currentTenantId);
      }
    }

    // 1. Build match criteria for users belonging to this tenant
    const userMatchConditions: any[] = [
      { tenantId: currentTenantId },
      { tenantIds: currentTenantId },
      { 'workspaces.tenantId': currentTenantId },
    ];

    if (tenantCode && tenantCode !== currentTenantId) {
      userMatchConditions.push(
        { tenantId: tenantCode },
        { tenantIds: tenantCode },
        { 'workspaces.tenantId': tenantCode }
      );
    }

    if (tenantObjectId) {
      userMatchConditions.push(
        { tenant: tenantObjectId },
        { tenants: tenantObjectId },
        { 'workspaces.tenant': tenantObjectId }
      );
    }

    // MongoDB Aggregation Pipeline for Users:
    // a) $match: Get users belonging to req.user.tenantId
    // b) $lookup: Join with the leads collection where leads.assignedTo matches the user AND leads.tenantId equals req.user.tenantId
    // c) $addFields / $filter: Filter the joined leads to only keep those where stage is 'Won / Closed'
    // d) $reduce: Calculate the sum of estimatedValue of those filtered leads
    // e) Project this sum as a new field called closedRevenue for each user
    const usersWithRevenue = await User.aggregate([
      {
        $match: {
          $or: userMatchConditions,
        },
      },
      {
        $lookup: {
          from: 'leads',
          let: {
            userId: '$_id',
            userIdStr: { $toString: '$_id' },
            userName: '$name',
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    // Strict tenant isolation:
                    {
                      $or: [
                        ...(tenantObjectId ? [{ $eq: ['$tenantId', tenantObjectId] }] : []),
                        { $eq: ['$tenantId', currentTenantId] },
                        { $eq: ['$tenantCode', tenantCode] },
                        { $eq: ['$tenantCode', currentTenantId] },
                      ],
                    },
                    // Match assigned sales rep:
                    {
                      $or: [
                        { $eq: ['$assignedTo', '$$userId'] },
                        { $eq: ['$assignedTo', '$$userIdStr'] },
                        { $eq: ['$assignedTo.id', '$$userIdStr'] },
                        { $eq: ['$assignedTo.id', '$$userId'] },
                        { $eq: ['$assignedTo._id', '$$userId'] },
                        { $eq: ['$assignedTo._id', '$$userIdStr'] },
                        { $eq: ['$assignedTo.name', '$$userName'] },
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: 'allAssignedLeads',
        },
      },
      {
        $addFields: {
          // c) Filter the joined leads to only keep those where stage is 'Won / Closed' (or 'Won')
          wonLeads: {
            $filter: {
              input: '$allAssignedLeads',
              as: 'lead',
              cond: {
                $or: [
                  { $eq: ['$$lead.stage', 'Won / Closed'] },
                  { $eq: ['$$lead.stage', 'Won'] },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          // d) & e) Calculate the sum of estimatedValue and project as closedRevenue
          closedRevenue: {
            $reduce: {
              input: '$wonLeads',
              initialValue: 0,
              in: {
                $add: [
                  '$$value',
                  { $ifNull: ['$$this.estimatedValue', { $ifNull: ['$$this.value', 0] }] },
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          password: 0,
          resetOtp: 0,
          resetOtpExpiry: 0,
          allAssignedLeads: 0,
          wonLeads: 0,
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    // 2. Fetch all pending invitations for this tenant
    const invitations = await Invitation.find({
      tenantId: currentTenantId,
    }).sort({ createdAt: -1 });

    // 3. Format active users with role/dept specific to this workspace & calculated closedRevenue
    const formattedUsers = usersWithRevenue.map((u: any) => {
      const workspaceInfo = u.workspaces?.find((w: any) => w.tenantId === currentTenantId || w.tenantId === tenantCode);
      const roleInWorkspace = workspaceInfo?.role || u.role;
      const deptInWorkspace = workspaceInfo?.department || u.department || 'General';
      const statusInWorkspace =
        workspaceInfo?.status || u.status || (u.isActive ? 'Active' : 'Invited');

      return {
        id: u._id.toString(),
        _id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: roleInWorkspace,
        department: deptInWorkspace,
        status: statusInWorkspace,
        avatar:
          u.profilePicture ||
          u.avatar ||
          '',
        phone: u.phone || '',
        closedRevenue: u.closedRevenue || 0,
        type: 'user' as const,
        createdAt: u.createdAt,
      };
    });

    // 4. Format pending invitations
    const formattedInvitations = invitations.map((inv) => ({
      id: inv._id.toString(),
      _id: inv._id.toString(),
      name: inv.email.split('@')[0],
      email: inv.email,
      role: inv.role,
      department: inv.department || 'General',
      status: 'Invited' as const,
      avatar: '',
      phone: '',
      closedRevenue: 0,
      type: 'invitation' as const,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
    }));

    // Combine both: users first, then pending invitations
    const combinedTeam = [...formattedUsers, ...formattedInvitations];

    res.status(200).json({
      success: true,
      count: combinedTeam.length,
      usersCount: formattedUsers.length,
      invitationsCount: formattedInvitations.length,
      team: combinedTeam,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * @route   GET /api/team/invitation/:token
 * @desc    Validate token and return invitation details for the landing page
 * @access  Public
 */
export const getInvitationByToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Invitation token is missing.',
      });
      return;
    }

    const invitation = await Invitation.findOne({ token });

    if (!invitation) {
      res.status(404).json({
        success: false,
        message: 'This invitation link is invalid or has already been used.',
      });
      return;
    }

    if (new Date() > invitation.expiresAt) {
      res.status(410).json({
        success: false,
        message: 'This invitation has expired. Please ask your company administrator for a new invite.',
        expired: true,
      });
      return;
    }

    // Check if user with this email already exists in the system
    const existingUser = await User.findOne({ email: invitation.email.toLowerCase().trim() });

    // Fetch tenant company name
    const tenant = await Tenant.findOne({ tenantId: invitation.tenantId });

    res.status(200).json({
      success: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        department: invitation.department,
        companyName: tenant?.name || 'Enterprise Workspace',
        tenantId: invitation.tenantId,
        expiresAt: invitation.expiresAt,
        isExistingUser: Boolean(existingUser),
        existingUserName: existingUser?.name || '',
      },
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * @route   POST /api/team/accept-invite/:token
 * @desc    Accept invitation. If user exists, add workspace to their tenant array. If new, create user.
 * @access  Public
 */
export const acceptInvite = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.params;
    const { fullName, newPassword, password } = req.body;

    const chosenPassword = newPassword || password;
    const chosenName = (fullName || (req.body as any).name)?.trim();

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'Invitation token is required.',
      });
      return;
    }

    // 1. Locate invitation by token
    const invitation = await Invitation.findOne({ token });

    if (!invitation) {
      res.status(404).json({
        success: false,
        message: 'Invalid or expired invitation token. Please contact your company administrator.',
      });
      return;
    }

    // 2. Check expiration
    if (new Date() > invitation.expiresAt) {
      await Invitation.findByIdAndDelete(invitation._id);
      res.status(410).json({
        success: false,
        message: 'This invitation link has expired. Please request a new invite from your administrator.',
      });
      return;
    }

    // 3. Find tenant ObjectId
    let tenantObjectId = invitation.tenant;
    let tenantDoc = null;
    if (tenantObjectId) {
      tenantDoc = await Tenant.findById(tenantObjectId);
    } else {
      tenantDoc = await Tenant.findOne({ tenantId: invitation.tenantId });
      if (tenantDoc) {
        tenantObjectId = tenantDoc._id as any;
      }
    }

    // 4. Check if user already exists in DB
    let user = await User.findOne({ email: invitation.email.toLowerCase().trim() });

    if (user) {
      // USER ALREADY EXISTS: Do NOT require or hash a new password!
      // Check if user is already a member of this workspace
      const isAlreadyMember =
        user.tenantId === invitation.tenantId ||
        user.tenantIds?.includes(invitation.tenantId) ||
        user.workspaces?.some((w) => w.tenantId === invitation.tenantId);

      if (isAlreadyMember) {
        await Invitation.findByIdAndDelete(invitation._id);
        res.status(400).json({
          success: false,
          message: 'You are already an active member of this workspace.',
        });
        return;
      }

      // Add to tenantIds array
      if (!user.tenantIds) {
        user.tenantIds = [];
      }
      if (!user.tenantIds.includes(invitation.tenantId)) {
        user.tenantIds.push(invitation.tenantId);
      }

      // Add to tenants ObjectId array
      if (tenantObjectId) {
        if (!user.tenants) {
          user.tenants = [];
        }
        const tStr = tenantObjectId.toString();
        if (!user.tenants.some((t) => t.toString() === tStr)) {
          user.tenants.push(tenantObjectId);
        }
      }

      // Add to workspaces subdocument array
      if (!user.workspaces) {
        user.workspaces = [];
      }
      user.workspaces.push({
        tenantId: invitation.tenantId,
        tenant: tenantObjectId,
        role: invitation.role as any,
        department: invitation.department,
        status: 'Active',
        joinedAt: new Date(),
      });

      // Switch active tenantId context to the accepted workspace
      user.tenantId = invitation.tenantId;
      if (tenantObjectId) {
        user.tenant = tenantObjectId;
      }
      user.role = invitation.role as any;
      user.department = invitation.department;
      user.status = 'Active';
      user.isActive = true;

      // Update name if provided and user's current name is empty
      if (chosenName && (!user.name || user.name === user.email.split('@')[0])) {
        user.name = chosenName;
      }

      // Save user (password is not modified, so pre-save hook will NOT re-hash it)
      await user.save();
    } else {
      // USER IS NEW: Validate name and password
      if (!chosenName) {
        res.status(400).json({
          success: false,
          message: 'Full name is required.',
        });
        return;
      }

      if (!chosenPassword || chosenPassword.length < 8) {
        res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long.',
        });
        return;
      }

      user = await User.create({
        name: chosenName,
        email: invitation.email.toLowerCase().trim(),
        password: chosenPassword, // pre-save hook will bcrypt hash
        role: invitation.role,
        department: invitation.department,
        tenantId: invitation.tenantId,
        tenant: tenantObjectId,
        tenantIds: [invitation.tenantId],
        tenants: tenantObjectId ? [tenantObjectId] : [],
        workspaces: [
          {
            tenantId: invitation.tenantId,
            tenant: tenantObjectId,
            role: invitation.role as any,
            department: invitation.department,
            status: 'Active',
            joinedAt: new Date(),
          },
        ],
        status: 'Active',
        isActive: true,
        avatar:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      });
    }

    // Create Notification record for this tenant
    try {
      const targetTenantObjId = tenantObjectId || (tenantDoc ? tenantDoc._id : null);
      if (targetTenantObjId) {
        await Notification.create({
          tenantId: targetTenantObjId,
          tenantCode: invitation.tenantId,
          title: 'New Member Joined',
          message: `${user.name || chosenName || invitation.email} has accepted the invitation`,
          type: 'INVITE_ACCEPTED',
          isRead: false,
        });
      }
    } catch (notifError) {
      console.error('[Notification Creation Error - acceptInvitation]:', notifError);
    }

    // 5. Delete invitation record
    await Invitation.findByIdAndDelete(invitation._id);

    // 6. Generate JWT token for seamless auto-login into this workspace
    const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key';
    const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
    const jwtToken = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: invitation.role as any,
        tenantId: invitation.tenantId,
      },
      jwtSecret,
      { expiresIn: expiresIn as any }
    );

    res.status(200).json({
      success: true,
      message: 'Workspace invitation successfully accepted! Welcome to the team.',
      token: jwtToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: invitation.role,
        department: invitation.department,
        tenantId: invitation.tenantId,
        status: user.status,
        companyName: tenantDoc?.name || 'Enterprise Workspace',
      },
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * @route   DELETE /api/team/remove/:id (also aliased at DELETE /api/team/:id)
 * @desc    Remove a member from the workspace using $pull or cancel a pending invitation
 * @access  Private (JWT Protected, Company Admin / Super Admin)
 */
export const removeTeamMember = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const currentTenantId = req.user?.tenantId;

    if (!currentTenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant context is missing.',
      });
      return;
    }

    // Verify Admin privileges for current tenant
    if (req.user?.role !== 'Company Admin' && req.user?.role !== 'Super Admin') {
      res.status(403).json({
        success: false,
        message: 'Access Denied: Only Company Admins have permission to remove members or cancel invites.',
      });
      return;
    }

    // Validate ID format
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid member or invitation identifier provided.',
      });
      return;
    }

    // c) Self-deletion check: A Company Admin cannot delete themselves
    const userToDeleteId = id;
    const currentUserId = req.user?._id ? req.user._id.toString() : (req.user?.id ? req.user.id.toString() : '');
    if (
      userToDeleteId === currentUserId ||
      (req.user?._id && userToDeleteId === req.user._id.toString()) ||
      (req.user?.id && userToDeleteId === req.user.id.toString())
    ) {
      res.status(400).json({
        success: false,
        message: 'Security constraint: You cannot delete your own active administrator account.',
      });
      return;
    }

    // b) Target user/invite's tenantId MUST match req.user.tenantId
    // Resolve Tenant ObjectId and Code to align with GET /api/team
    let tenantObjectId: mongoose.Types.ObjectId | null = null;
    let tenantCode = currentTenantId;

    try {
      const context = await getTenantContext(req);
      tenantObjectId = context.tenantObjectId;
      tenantCode = context.tenantCode;
    } catch {
      if (mongoose.isValidObjectId(currentTenantId)) {
        tenantObjectId = new mongoose.Types.ObjectId(currentTenantId);
      }
    }

    // 1. Check if ID belongs to an Invitation in this tenant
    const inviteMatchConditions: any[] = [{ tenantId: currentTenantId }];
    if (tenantCode && tenantCode !== currentTenantId) {
      inviteMatchConditions.push({ tenantId: tenantCode });
    }
    if (tenantObjectId) {
      inviteMatchConditions.push({ tenant: tenantObjectId });
    }

    const deletedInvite = await Invitation.findOneAndDelete({
      _id: userToDeleteId,
      $or: inviteMatchConditions,
    });

    if (deletedInvite) {
      res.status(200).json({
        success: true,
        message: 'Member removed successfully',
      });
      return;
    }

    // 2. Check if ID belongs to a registered User in this workspace
    // Zero hardcoded role restrictions - Company Admin can delete ANY role (Employee, Support, Sales Agent, etc.)
    const userMatchConditions: any[] = [
      { tenantId: currentTenantId },
      { tenantIds: currentTenantId },
      { 'workspaces.tenantId': currentTenantId },
    ];

    if (tenantCode && tenantCode !== currentTenantId) {
      userMatchConditions.push(
        { tenantId: tenantCode },
        { tenantIds: tenantCode },
        { 'workspaces.tenantId': tenantCode }
      );
    }

    if (tenantObjectId) {
      userMatchConditions.push(
        { tenant: tenantObjectId },
        { tenants: tenantObjectId },
        { 'workspaces.tenant': tenantObjectId }
      );
    }

    const userToDelete = await User.findOne({
      _id: userToDeleteId,
      $or: userMatchConditions,
    });

    if (!userToDelete) {
      res.status(404).json({
        success: false,
        message: 'Team member or invitation not found in this workspace.',
      });
      return;
    }

    // Check if user has active memberships in other tenant workspaces
    const remainingWorkspaces =
      userToDelete.workspaces?.filter(
        (w) =>
          w.tenantId !== currentTenantId &&
          (tenantCode ? w.tenantId !== tenantCode : true) &&
          (tenantObjectId ? String(w.tenant) !== String(tenantObjectId) : true)
      ) || [];

    if (remainingWorkspaces.length > 0) {
      // User is part of other workspaces: safely detach from this workspace only
      const fallbackTenantId = remainingWorkspaces[0].tenantId;
      const fallbackTenant = remainingWorkspaces[0].tenant;
      const fallbackRole = remainingWorkspaces[0].role;
      const fallbackDept = remainingWorkspaces[0].department;

      const tenantIdsToRemove = [currentTenantId, tenantCode].filter(Boolean);

      await User.findByIdAndUpdate(
        userToDelete._id,
        {
          $pull: {
            tenantIds: { $in: tenantIdsToRemove },
            ...(tenantObjectId ? { tenants: tenantObjectId } : {}),
            workspaces: {
              tenantId: { $in: tenantIdsToRemove },
            },
          },
          $set: {
            tenantId: fallbackTenantId,
            tenant: fallbackTenant,
            role: fallbackRole,
            department: fallbackDept,
          },
        },
        { new: true }
      );
    } else {
      // User only belongs to this workspace: delete the user record directly
      await userToDelete.deleteOne();
    }

    res.status(200).json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error: any) {
    next(error);
  }
};
