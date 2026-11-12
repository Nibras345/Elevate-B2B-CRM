import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Request } from 'express';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if Cloudinary credentials are fully configured
const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

// 1. Cloudinary Storage Engine for Cloud Uploads (Targeting "crm_billing" folder)
const cloudinaryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (_req: Request, file: Express.Multer.File) => {
    const timestamp = Date.now();
    const cleanName = file.originalname
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 30);

    return {
      folder: 'crm_billing',
      public_id: `proof_${cleanName || 'payment'}_${timestamp}`,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto' }],
    };
  },
});

// 2. Local Disk Storage Engine (Fallback for environments without Cloudinary)
const baseUploads = fs.existsSync(path.resolve(__dirname, '../../uploads'))
  ? path.resolve(__dirname, '../../uploads')
  : path.resolve(process.cwd(), 'uploads');

const uploadDir = path.join(baseUploads, 'billing');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 25);
    const uniqueSuffix = `${Date.now()}_${Math.round(Math.random() * 1e6)}`;
    cb(null, `proof_${cleanBase || 'payment'}_${uniqueSuffix}${ext || '.png'}`);
  },
});

// File filter enforcing image-only uploads
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type: Only image files (JPG, PNG, WEBP) are allowed.'));
  }
};

// Select Cloudinary if configured; otherwise gracefully fallback to local disk
const activeStorage = isCloudinaryConfigured ? cloudinaryStorage : diskStorage;

export const uploadBillingScreenshot = multer({
  storage: activeStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max limit
  },
  fileFilter,
});

