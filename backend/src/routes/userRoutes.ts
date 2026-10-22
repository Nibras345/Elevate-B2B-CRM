import { Router } from 'express';
import {
  updateUserProfile,
  getUserProfile,
  changePassword,
  forgotPassword,
  verifyOtp,
  resetPassword,
} from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';
import { uploadProfilePicture } from '../middleware/uploadMiddleware';

const router: Router = Router();

/**
 * @route   POST /api/users/forgot-password
 * @desc    Generate 6-digit OTP and send to user's email via Nodemailer
 * @access  Public
 */
router.post('/forgot-password', forgotPassword);

/**
 * @route   POST /api/users/verify-otp
 * @desc    Verify 6-digit OTP validity and expiration
 * @access  Public
 */
router.post('/verify-otp', verifyOtp);

/**
 * @route   POST /api/users/reset-password
 * @desc    Verify OTP and reset password with bcryptjs salt round 10
 * @access  Public
 */
router.post('/reset-password', resetPassword);

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

