import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary';

// Configure Multer Cloudinary storage engine targeting "crm_profiles" folder
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (_req: Request, file: Express.Multer.File) => {
    const timestamp = Date.now();
    const cleanName = file.originalname
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 30);

    return {
      folder: 'crm_profiles',
      public_id: `${cleanName}_${timestamp}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
    };
  },
});

// File type filter to enforce image-only uploads
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type: Only JPG, PNG, WEBP, and GIF images are permitted.'));
  }
};

// Multer upload instance with 5MB max file size
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 Megabytes
  },
  fileFilter: fileFilter,
});

/**
 * Middleware for handling single profile picture uploads
 * Supports field names 'profilePicture' and 'avatar' with robust error handling
 */
export const uploadProfilePicture = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const singleUploader = upload.single('profilePicture');

  singleUploader(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          success: false,
          message: 'The selected image is too large. Maximum file size allowed is 5MB.',
        });
        return;
      }
      res.status(400).json({
        success: false,
        message: `File upload validation failed: ${err.message}`,
      });
      return;
    } else if (err) {
      res.status(400).json({
        success: false,
        message: err.message || 'Failed to process image upload.',
      });
      return;
    }

    next();
  });
};

export default uploadProfilePicture;
