import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Notification } from '../models/Notification';
import { AuthRequest } from '../types';
import { getTenantContext } from '../utils/tenantHelper';

/**
 * Helper to build strict tenant isolation filter for notifications
 */
const buildTenantFilter = async (req: AuthRequest) => {
  const { tenantObjectId, tenantCode } = await getTenantContext(req);
  const rawTenantId = req.user?.tenantId || req.tenantId;

  return {
    $or: [
      { tenantId: tenantObjectId },
      ...(rawTenantId && mongoose.isValidObjectId(rawTenantId)
        ? [{ tenantId: new mongoose.Types.ObjectId(rawTenantId) }]
        : []),
      ...(tenantCode ? [{ tenantCode }] : []),
      ...(rawTenantId && typeof rawTenantId === 'string' ? [{ tenantCode: rawTenantId }] : []),
    ],
  };
};

/**
 * @route   GET /api/notifications
 * @desc    Fetch recent notifications for current tenant (up to 20, newest first)
 * @access  Private (JWT Protected)
 */
export const getNotifications = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantFilter = await buildTenantFilter(req);

    // Fetch last 20 notifications sorted by newest first
    const notifications = await Notification.find(tenantFilter)
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    // Total count of unread notifications for this tenant
    const unreadCount = await Notification.countDocuments({
      ...tenantFilter,
      isRead: false,
    });

    res.status(200).json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/notifications/mark-all-read
 * @desc    Mark all unread notifications for current tenant as read
 * @access  Private (JWT Protected)
 */
export const markAllAsRead = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantFilter = await buildTenantFilter(req);

    // Update all unread notifications for this tenant
    const updateResult = await Notification.updateMany(
      {
        ...tenantFilter,
        isRead: false,
      },
      {
        $set: { isRead: true },
      }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: updateResult.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
};
