import { Router } from 'express';
import { register, login, getMe, logout, refreshAccessToken } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';
import { authLimiter } from '../middleware/rateLimiter';
import { validateResource } from '../middleware/validateResource';
import { registerSchema, loginSchema } from '../schemas/auth.schema';

const router: Router = Router();

/**
 * Public Routes
 */
router.post('/register', validateResource(registerSchema), register);
router.post('/login', authLimiter, validateResource(loginSchema), login);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logout);

/**
 * Protected Routes
 */
router.get('/me', protect, getMe);

export default router;
