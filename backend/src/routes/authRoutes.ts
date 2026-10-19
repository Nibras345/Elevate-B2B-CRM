import { Router } from 'express';
import { register, login, getMe, logout } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router: Router = Router();

/**
 * Public Routes
 */
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

/**
 * Protected Routes
 */
router.get('/me', protect, getMe);

export default router;
