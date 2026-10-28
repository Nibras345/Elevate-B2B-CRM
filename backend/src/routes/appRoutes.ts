import { Router } from 'express';
import { getSidebarStats } from '../controllers/appController';
import { protect, tenantGuard } from '../middleware/authMiddleware';

const router = Router();

// GET /api/app/sidebar-stats - Protected route for dynamic sidebar counts
router.get('/sidebar-stats', protect, tenantGuard, getSidebarStats);

export default router;
