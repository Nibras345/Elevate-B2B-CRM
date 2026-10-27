import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../models/User';
import { Invitation } from '../models/Invitation';
import { Tenant } from '../models/Tenant';
import { AuthRequest } from '../types';
import { sendInvitationEmail } from '../utils/emailService';

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

    // 2. Generate a secure crypto token
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

    // 1. Fetch all users belonging to this tenant (querying tenantId, tenantIds array, or workspaces array)
    const users = await User.find({
      $or: [
        { tenantId: currentTenantId },
        { tenantIds: currentTenantId },
        { 'workspaces.tenantId': currentTenantId },
      ],
    })
      .select('-password')
      .sort({ createdAt: -1 });

    // 2. Fetch all pending invitations for this tenant
    const invitations = await Invitation.find({
      tenantId: currentTenantId,
    }).sort({ createdAt: -1 });

    // 3. Format active users with role/dept specific to this workspace
    const formattedUsers = users.map((u) => {
      const workspaceInfo = u.workspaces?.find((w) => w.tenantId === currentTenantId);
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
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        phone: u.phone || '',
        closedRevenue: '$0',
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
      avatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80',
      phone: '',
      closedRevenue: '$0',
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
    const chosenName = fullName?.trim();

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

    // Prevent self-deletion
    const currentUserId = req.user?.id || req.user?._id?.toString();
    if (id === currentUserId) {
      res.status(400).json({
        success: false,
        message: 'Security Guard: You cannot remove your own active administrator account.',
      });
      return;
    }

    // 1. Check if ID belongs to an Invitation in this tenant
    const deletedInvite = await Invitation.findOneAndDelete({
      _id: id,
      tenantId: currentTenantId,
    });

    if (deletedInvite) {
      res.status(200).json({
        success: true,
        message: 'Member removed successfully',
      });
      return;
    }

    // 2. Check if ID belongs to a registered User in this workspace
    const targetUser = await User.findOne({
      _id: id,
      $or: [
        { tenantId: currentTenantId },
        { tenantIds: currentTenantId },
        { 'workspaces.tenantId': currentTenantId },
      ],
    });

    if (!targetUser) {
      res.status(404).json({
        success: false,
        message: 'Team member or invitation not found in this workspace.',
      });
      return;
    }

    // Do NOT delete the entire user document (as they might be part of other tenants).
    // Instead, use $pull to remove currentTenantId and workspace entry
    const remainingWorkspaces =
      targetUser.workspaces?.filter((w) => w.tenantId !== currentTenantId) || [];

    let fallbackTenantId = targetUser.tenantId;
    let fallbackTenant = targetUser.tenant;
    let fallbackRole = targetUser.role;
    let fallbackDept = targetUser.department;

    if (targetUser.tenantId === currentTenantId) {
      if (remainingWorkspaces.length > 0) {
        fallbackTenantId = remainingWorkspaces[0].tenantId;
        fallbackTenant = remainingWorkspaces[0].tenant;
        fallbackRole = remainingWorkspaces[0].role;
        fallbackDept = remainingWorkspaces[0].department;
      } else {
        fallbackTenantId = '';
        fallbackTenant = undefined;
      }
    }

    await User.findByIdAndUpdate(
      targetUser._id,
      {
        $pull: {
          tenantIds: currentTenantId,
          workspaces: { tenantId: currentTenantId },
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

    res.status(200).json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error: any) {
    next(error);
  }
};
