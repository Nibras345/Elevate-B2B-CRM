import { Router } from 'express';
import { register, login, getMe, logout, refreshAccessToken } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';
import { authLimiter } from '../middleware/rateLimiter';

const router: Router = Router();

/**
 * Public Routes
 */
router.post('/register', register);
router.post('/login', authLimiter, login);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logout);

/**
 * Protected Routes
 */
router.get('/me', protect, getMe);

export default router;
