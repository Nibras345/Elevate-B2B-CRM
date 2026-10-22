import { Response, NextFunction } from 'express';
import { User } from '../models/User';
import { AuthRequest } from '../types';

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
    next(error);
  }
};
