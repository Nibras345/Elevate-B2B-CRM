import { Router } from 'express';
import { protect, requireSuperAdmin } from '../middleware/authMiddleware';
import {
  getSuperAdminDashboardStats,
  getSuperAdminTenants,
  updateTenantStatus,
  deleteTenant,
} from '../controllers/superAdminController';
import {
  getSuperAdminSeatRequests,
  assignSeats,
  rejectSeats,
} from '../controllers/billingController';

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

/**
 * @route   GET /api/super-admin/seat-requests
 * @desc    Fetch pending or all seat upgrade requests
 */
router.get('/seat-requests', getSuperAdminSeatRequests);

/**
 * @route   PUT /api/super-admin/assign-seats/:requestId
 * @desc    Approve a seat request and increase company maxSeats
 */
router.put('/assign-seats/:requestId', assignSeats);

/**
 * @route   PUT /api/super-admin/reject-seats/:requestId
 * @desc    Reject a pending seat request
 */
router.put('/reject-seats/:requestId', rejectSeats);

export default router;

