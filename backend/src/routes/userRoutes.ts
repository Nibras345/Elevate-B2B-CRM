import { Router } from 'express';
import {
  updateUserProfile,
  getUserProfile,
  changePassword,
} from '../controllers/userController';
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

/**
 * @route   PUT /api/users/change-password
 * @desc    Update user password after verifying current password
 * @access  Private (JWT Protected)
 */
router.put('/change-password', protect, changePassword);

export default router;
