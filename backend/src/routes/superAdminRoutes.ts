import { Router } from 'express';
import { protect, requireSuperAdmin } from '../middleware/authMiddleware';
import {
  getSuperAdminDashboardStats,
  getSuperAdminTenants,
  updateTenantStatus,
  deleteTenant,
} from '../controllers/superAdminController';

const router = Router();

// Apply authentication and strict Super Admin guard across all routes
router.use(protect);
router.use(requireSuperAdmin);

/**
 * @route   GET /api/super-admin/dashboard-stats
 * @desc    Get aggregated platform metrics for Super Admin
 */
router.get('/dashboard-stats', getSuperAdminDashboardStats);

/**
 * @route   GET /api/super-admin/tenants
 * @desc    Get all registered companies with metrics
 */
router.get('/tenants', getSuperAdminTenants);

/**
 * @route   PATCH /api/super-admin/tenants/:id/status
 * @desc    Toggle or update tenant operational status
 */
router.patch('/tenants/:id/status', updateTenantStatus);

/**
 * @route   DELETE /api/super-admin/tenants/:id
 * @desc    Delete a tenant
 */
router.delete('/tenants/:id', deleteTenant);

export default router;

