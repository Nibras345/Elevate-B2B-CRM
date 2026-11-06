import { Router } from 'express';
import { protect, tenantGuard, authorizeRoles } from '../middleware/authMiddleware';
import { uploadBillingScreenshot } from '../middleware/billingUpload';
import { requestSeats, getMySeatRequests } from '../controllers/billingController';

const router = Router();

// All billing endpoints require authentication and tenant context
router.use(protect);
router.use(tenantGuard);

/**
 * @route   POST /api/billing/request-seats
 * @desc    Submit payment screenshot and request additional seats
 * @access  Private (Company Admin / Super Admin)
 */
router.post(
  '/request-seats',
  authorizeRoles('Company Admin', 'Super Admin'),
  uploadBillingScreenshot.single('screenshot'),
  requestSeats
);

/**
 * @route   GET /api/billing/my-requests
 * @desc    Get tenant's seat upgrade requests
 * @access  Private (Company Admin / Super Admin)
 */
router.get(
  '/my-requests',
  authorizeRoles('Company Admin', 'Super Admin'),
  getMySeatRequests
);

export default router;

