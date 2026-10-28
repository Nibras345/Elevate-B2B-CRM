import { Router } from 'express';
import { getNotifications, markAllAsRead } from '../controllers/notificationController';
import { protect, tenantGuard } from '../middleware/authMiddleware';

const router = Router();

// GET /api/notifications - Fetch latest 20 notifications for authenticated tenant
router.get('/', protect, tenantGuard, getNotifications);

// PUT /api/notifications/mark-all-read - Mark all unread notifications as read
router.put('/mark-all-read', protect, tenantGuard, markAllAsRead);

export default router;
