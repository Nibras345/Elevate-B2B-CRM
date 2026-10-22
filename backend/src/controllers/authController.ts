import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { Tenant } from '../models/Tenant';
import { AuthRequest, JwtPayload, UserRole } from '../types';

/**
 * Generate Secure Signed JWT Token
 */
const generateToken = (userId: string, email: string, role: UserRole, tenantId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    { userId, email, role, tenantId } as JwtPayload,
    secret,
    { expiresIn: expiresIn as any }
  );
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new tenant company & primary company admin
 * @access  Public
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, companyName, role = 'Company Admin' } = req.body;

    if (!name || !email || !password || !companyName) {
      res.status(400).json({
        success: false,
        message: 'Name, email, password, and company name are required.',
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in.',
      });
      return;
    }

    // Generate unique Tenant ID
    const cleanPrefix = companyName.trim().replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase() || 'CORP';
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const generatedTenantId = `TNT-${cleanPrefix}-${randomSuffix}`;

    // Create or find Tenant organization
    let tenant = await Tenant.findOne({ name: companyName.trim() });
    if (!tenant) {
      tenant = await Tenant.create({
        name: companyName.trim(),
        tenantId: generatedTenantId,
        currency: 'USD ($)',
        defaultTaxRate: 10,
        invoiceTerms: 'Net 30 Days',
      });
    }

    // Create user
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role as UserRole,
      tenantId: tenant.tenantId,
      tenant: tenant._id,
      department: role === 'Company Admin' ? 'Executive Management' : 'Sales & Revenue',
    });

    // Generate JWT
    const token = generateToken(
      newUser._id.toString(),
      newUser.email,
      newUser.role,
      newUser.tenantId
    );

    res.status(201).json({
      success: true,
      message: `Tenant workspace provisioned successfully for ${tenant.name}.`,
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        tenantId: newUser.tenantId,
        companyName: tenant.name,
        avatar: newUser.avatar,
        department: newUser.department,
      },
      tenant: {
        id: tenant._id,
        name: tenant.name,
        tenantId: tenant.tenantId,
        currency: tenant.currency,
        defaultTaxRate: tenant.defaultTaxRate,
        invoiceTerms: tenant.invoiceTerms,
      },
    });
  } catch (error) {
    console.error("API Error Details:", error);
    next(error);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user with email & password, return signed JWT
 * @access  Public
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
      return;
    }

    // Query user and explicitly select password field
    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+password')
      .populate('tenant');

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact your company administrator.',
      });
      return;
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password credentials.',
      });
      return;
    }

    // Generate JWT
    const token = generateToken(
      user._id.toString(),
      user.email,
      user.role,
      user.tenantId
    );

    const tenantInfo = (user as any).tenant || {
      name: 'Apex Enterprise',
      tenantId: user.tenantId,
    };

    res.status(200).json({
      success: true,
      message: 'Signed in successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        companyName: tenantInfo.name,
        avatar: user.avatar,
        department: user.department,
      },
      tenant: tenantInfo,
    });
  } catch (error) {
    console.error("API Error Details:", error);
    next(error);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get currently logged in user profile and tenant details
 * @access  Private (JWT Protected)
 */
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Not authenticated' });
      return;
    }

    const tenant = await Tenant.findOne({ tenantId: req.user.tenantId });

    res.status(200).json({
      success: true,
      user: req.user,
      tenant,
    });
  } catch (error) {
    console.error("API Error Details:", error);
    next(error);
  }
};

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user session
 * @access  Public
 */
export const logout = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    message: 'Signed out successfully.',
  });
};
