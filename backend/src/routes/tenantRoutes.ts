import { Router } from 'express';
import { getTenantStats } from '../controllers/tenantController';
import { protect, tenantGuard } from '../middleware/authMiddleware';

const router = Router();

/**
 * Protected routes for tenant statistics and workspace configuration
 */
// GET /api/tenant/stats
router.get('/stats', protect, tenantGuard, getTenantStats);

export default router;
