import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Tenant } from '../models/Tenant';
import { Invitation } from '../models/Invitation';
import { AuthRequest } from '../types';

/**
 * @route   GET /api/tenant/stats
 * @desc    Fetch workspace statistics (active users, pending invites, used seats & max seats)
 * @access  Private (JWT Protected)
 */
export const getTenantStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Resolve current tenantId from authenticated user context
    const currentTenantId =
      req.user?.tenantId ||
      req.tenantId ||
      (req.user?.tenantIds && req.user.tenantIds.length > 0 ? req.user.tenantIds[0] : null);

    if (!currentTenantId) {
      res.status(400).json({
        success: false,
        message: 'Tenant context is missing. Please sign in or switch workspace.',
      });
      return;
    }

    // 2. Count active users belonging to this tenant
    const activeUsersCount = await User.countDocuments({
      $or: [
        { tenantId: currentTenantId },
        { tenantIds: currentTenantId },
        { 'workspaces.tenantId': currentTenantId },
      ],
      isActive: { $ne: false },
    });

    // 3. Count pending invitations for this tenant
    const pendingInvitesCount = await Invitation.countDocuments({
      tenantId: currentTenantId,
    });

    // 4. Calculate total seats in use (Active Users + Pending Invites)
    const usedSeats = activeUsersCount + pendingInvitesCount;

    // 5. Fetch tenant configuration for maxSeats
    const tenant = await Tenant.findOne({ tenantId: currentTenantId });
    const maxSeats = tenant?.maxSeats ?? 25;

    // 6. Return standard JSON response
    res.status(200).json({
      success: true,
      usedSeats,
      maxSeats,
      activeUsersCount,
      pendingInvitesCount,
      tenantId: currentTenantId,
      companyName: tenant?.name || req.user?.companyName || 'Enterprise Workspace',
    });
  } catch (error: any) {
    next(error);
  }
};
