import { Router } from 'express';
import { getDashboardStats, exportDashboardData } from '../controllers/dashboardController';
import { protect, tenantGuard } from '../middleware/authMiddleware';

const router = Router();

/**
 * @route   GET /api/dashboard/stats
 * @desc    Get aggregated executive dashboard metrics strictly isolated by tenant
 * @access  Private (JWT Protected)
 */
router.get('/stats', protect, tenantGuard, getDashboardStats);

/**
 * @route   GET /api/dashboard/export
 * @desc    Export CRM dashboard data (Invoices and Leads) as CSV strictly filtered by tenant and timeframe
 * @access  Private (JWT Protected)
 */
router.get('/export', protect, tenantGuard, exportDashboardData);

export default router;

