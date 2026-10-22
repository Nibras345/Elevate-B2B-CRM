import { Router } from 'express';
import { updateUserProfile, getUserProfile } from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';
import { uploadProfilePicture } from '../middleware/uploadMiddleware';

const router: Router = Router();

/**
 * @route   GET /api/users/profile
 * @desc    Fetch authenticated user's current profile information
 * @access  Private (JWT Protected)
 */
router.get('/profile', protect, getUserProfile);

/**
 * @route   PUT /api/users/profile
 * @desc    Update personal information and profile picture in Cloudinary
 * @access  Private (JWT Protected)
 */
router.put('/profile', protect, uploadProfilePicture, updateUserProfile);

export default router;
