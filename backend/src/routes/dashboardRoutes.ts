import { Router } from 'express';
import { getDashboardStats } from '../controllers/dashboardController';
import { protect, tenantGuard } from '../middleware/authMiddleware';

const router = Router();

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get aggregated executive dashboard metrics strictly isolated by tenant
 * @access  Private (JWT Protected)
 */
router.get('/stats', protect, tenantGuard, getDashboardStats);

export default router;

