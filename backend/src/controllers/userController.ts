import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { AuthRequest } from '../types';
import { sendOtpEmail } from '../utils/emailService';

/**
 * @route   PUT /api/users/profile
 * @desc    Update authenticated user's personal information and profile picture
 * @access  Private (JWT Protected)
 */
export const updateUserProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Extract the authenticated user's ID from req.user.id
    const userId = req.user?.id || (req.user as any)?._id?.toString();

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication required.',
      });
      return;
    }

    // 2. Locate user in MongoDB (excluding password)
    const user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Updates are not permitted.',
      });
      return;
    }

    // 3. Extract text fields from request body
    const { fullName, email, phone, department } = req.body;

    // Validate and update full name
    if (fullName !== undefined) {
      const cleanName = fullName.trim();
      if (!cleanName) {
        res.status(400).json({
          success: false,
          message: 'Full Name cannot be empty.',
        });
        return;
      }
      user.name = cleanName;
    }

    // Validate and update email
    if (email !== undefined) {
      const cleanEmail = email.toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        res.status(400).json({
          success: false,
          message: 'Please provide a valid email address.',
        });
        return;
      }

      // Check if another user already owns this email address
      if (cleanEmail !== user.email) {
        const existingEmailUser = await User.findOne({
          email: cleanEmail,
          _id: { $ne: user._id },
        });

        if (existingEmailUser) {
          res.status(400).json({
            success: false,
            message: 'An account with this email address already exists. Please choose a different one.',
          });
          return;
        }

        user.email = cleanEmail;
      }
    }

    // Update phone number
    if (phone !== undefined) {
      user.phone = phone.trim();
    }

    // Update department
    if (department !== undefined) {
      user.department = department.trim();
    }

    // 4. Handle uploaded file if present (extract secure Cloudinary URL)
    if (req.file) {
      const secureCloudinaryUrl =
        (req.file as any).path ||
        (req.file as any).secure_url ||
        (req.file as any).url;

      if (secureCloudinaryUrl) {
        user.profilePicture = secureCloudinaryUrl;
        user.avatar = secureCloudinaryUrl; // Maintain backwards compatibility
      }
    }

    // 5. Save updated user document
    await user.save();

    // 6. Return the updated user object (strictly excluding password) with a success message
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: user._id.toString(),
        _id: user._id,
        fullName: user.name,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        department: user.department || '',
        profilePicture: user.profilePicture || user.avatar || '',
        avatar: user.profilePicture || user.avatar || '',
        role: user.role,
        tenantId: user.tenantId,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("API Error Details:", error);
    next(error);
  }
};

/**
 * @route   GET /api/users/profile
 * @desc    Get currently authenticated user's profile details
 * @access  Private (JWT Protected)
 */
export const getUserProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.id || (req.user as any)?._id?.toString();

    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication required.',
      });
      return;
    }

    const user = await User.findById(userId).select('-password');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        _id: user._id,
        fullName: user.name,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        department: user.department || '',
        profilePicture: user.profilePicture || user.avatar || '',
        avatar: user.profilePicture || user.avatar || '',
        role: user.role,
        tenantId: user.tenantId,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("API Error Details:", error);
    next(error);
  }
};

/**
 * @route   PUT /api/users/change-password
 * @desc    Change authenticated user's password with current password verification
 * @access  Private (JWT Protected)
 */
export const changePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate presence of required fields
    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Please provide both your current password and a new password.',
      });
      return;
    }

    // Validate minimum password length
    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long.',
      });
      return;
    }

    // Extract user ID from authenticated request
    const userId = req.user?.id || (req.user as any)?._id?.toString();
    if (!userId) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: User authentication required.',
      });
      return;
    }

    // Fetch user and explicitly select password field
    const user = await User.findById(userId).select('+password');
    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Password updates are not permitted.',
      });
      return;
    }

    // Verify current password with bcrypt
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      res.status(400).json({
        success: false,
        message: 'Incorrect current password.',
      });
      return;
    }

    // Prevent re-using the same password
    if (currentPassword === newPassword) {
      res.status(400).json({
        success: false,
        message: 'New password must be different from your current password.',
      });
      return;
    }

    // Hash the new password with salt rounds of 10
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Save updated password to user document
    await user.save();

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    console.error("API Error Details:", error);
    next(error);
  }
};

/**
 * @route   POST /api/users/forgot-password
 * @desc    Generate random 6-digit OTP, store with 10min expiry, and send via Nodemailer
 * @access  Public
 */
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.',
      });
      return;
    }

    const cleanEmail = email.toString().trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'No account found with this email address.',
      });
      return;
    }

    // Generate random 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // 10 minutes expiry from now
    const resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    user.resetOtp = otp;
    user.resetOtpExpiry = resetOtpExpiry;
    await user.save();

    // Send email using Nodemailer
    try {
      await sendOtpEmail(user.email, otp, user.name);
    } catch (mailError) {
      console.error('Nodemailer Transporter Error:', mailError);
      res.status(500).json({
        success: false,
        message: 'Unable to send OTP verification email. Please check your email configuration.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'A 6-digit OTP has been sent to your email address.',
    });
  } catch (error) {
    console.error('forgotPassword error:', error);
    next(error);
  }
};

/**
 * @route   POST /api/users/verify-otp
 * @desc    Verify OTP and check expiry
 * @access  Public
 */
export const verifyOtp = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({
        success: false,
        message: 'Email and 6-digit OTP are required.',
      });
      return;
    }

    const cleanEmail = email.toString().trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'No account found with this email address.',
      });
      return;
    }

    // Verify OTP matches and has not expired
    if (
      !user.resetOtp ||
      user.resetOtp !== cleanOtp ||
      !user.resetOtpExpiry ||
      user.resetOtpExpiry.getTime() <= Date.now()
    ) {
      res.status(400).json({
        success: false,
        message: 'Invalid or Expired OTP',
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully.',
    });
  } catch (error) {
    console.error('verifyOtp error:', error);
    next(error);
  }
};

/**
 * @route   POST /api/users/reset-password
 * @desc    Verify OTP, hash newPassword using bcryptjs (salt round 10), and clear OTP fields
 * @access  Public
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      res.status(400).json({
        success: false,
        message: 'Email, OTP, and new password are required.',
      });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
      return;
    }

    const cleanEmail = email.toString().trim().toLowerCase();
    const cleanOtp = otp.toString().trim();

    const user = await User.findOne({ email: cleanEmail }).select('+password');

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
      return;
    }

    // Verify OTP and expiry once more for security
    if (
      !user.resetOtp ||
      user.resetOtp !== cleanOtp ||
      !user.resetOtpExpiry ||
      user.resetOtpExpiry.getTime() <= Date.now()
    ) {
      res.status(400).json({
        success: false,
        message: 'Invalid or Expired OTP',
      });
      return;
    }

    // Hash the newPassword using bcryptjs (salt round 10)
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Clear both resetOtp and resetOtpExpiry fields
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('resetPassword error:', error);
    next(error);
  }
};


