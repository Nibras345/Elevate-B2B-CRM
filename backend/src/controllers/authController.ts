import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { Tenant } from '../models/Tenant';
import { Invitation } from '../models/Invitation';
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
    { userId, email, role, tenantId: tenantId || '' } as JwtPayload,
    secret,
    { expiresIn: expiresIn as any }
  );
};

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (Company Admin provisions Tenant; Employee creates user without Tenant)
 * @access  Public
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, role = 'Company Admin', companyName } = req.body;

    // Validate essential inputs
    if (!name || !name.trim() || !email || !email.trim() || !password) {
      res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
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

    // Explicitly validate role
    const userRole: UserRole = role === 'Employee' ? 'Employee' : 'Company Admin';

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in.',
      });
      return;
    }

    let tenantDoc = null;
    let userTenantId = '';
    let userTenantObjectId: any = undefined;

    // Role-based logic
    if (userRole === 'Company Admin') {
      // Company Admin MUST provide companyName to provision a new Tenant
      if (!companyName || !companyName.trim()) {
        res.status(400).json({
          success: false,
          message: 'Company name is required for Company Admin registration.',
        });
        return;
      }

      const trimmedCompanyName = companyName.trim();
      const cleanPrefix = trimmedCompanyName.replace(/[^a-zA-Z]/g, '').substring(0, 4).toUpperCase() || 'CORP';
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const generatedTenantId = `TNT-${cleanPrefix}-${randomSuffix}`;

      // Create new document in Tenant collection
      tenantDoc = await Tenant.create({
        name: trimmedCompanyName,
        tenantId: generatedTenantId,
        currency: 'USD ($)',
        defaultTaxRate: 10,
        invoiceTerms: 'Net 30 Days',
      });

      userTenantId = tenantDoc.tenantId;
      userTenantObjectId = tenantDoc._id;
    } else {
      // Role is 'Employee': Do NOT create a new Tenant.
      // Check if there is an existing pending invitation for this email
      const pendingInvite = await Invitation.findOne({
        email: email.toLowerCase().trim(),
        expiresAt: { $gt: new Date() },
      }).sort({ createdAt: -1 });

      if (pendingInvite) {
        userTenantId = pendingInvite.tenantId;
        userTenantObjectId = pendingInvite.tenant;
        tenantDoc = await Tenant.findOne({ tenantId: userTenantId });
      }
    }

    // Create the new User document
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: userRole,
      tenantId: userTenantId,
      tenant: userTenantObjectId,
      department: userRole === 'Company Admin' ? 'Executive Management' : 'General',
    });

    // Generate JWT
    const token = generateToken(
      newUser._id.toString(),
      newUser.email,
      newUser.role,
      newUser.tenantId || ''
    );

    res.status(201).json({
      success: true,
      message: userRole === 'Company Admin'
        ? `Tenant workspace provisioned successfully for ${tenantDoc?.name}.`
        : 'Employee account created successfully.',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        tenantId: newUser.tenantId || '',
        companyName: tenantDoc ? tenantDoc.name : '',
        avatar: newUser.profilePicture || newUser.avatar || '',
        department: newUser.department,
      },
      tenant: tenantDoc
        ? {
            id: tenantDoc._id,
            name: tenantDoc.name,
            tenantId: tenantDoc.tenantId,
            currency: tenantDoc.currency,
            defaultTaxRate: tenantDoc.defaultTaxRate,
            invoiceTerms: tenantDoc.invoiceTerms,
            address: tenantDoc.address || '',
            website: tenantDoc.website || '',
          }
        : null,
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

    // Fetch user and include password hash
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

    // Check account status
    if (!user.isActive) {
      res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact your workspace administrator.',
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
      user.tenantId || ''
    );

    let tenantInfo: any = (user as any).tenant;
    if (!tenantInfo && user.tenantId) {
      tenantInfo = await Tenant.findOne({ tenantId: user.tenantId });
    }

    res.status(200).json({
      success: true,
      message: 'Signed in successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId || '',
        companyName: tenantInfo ? tenantInfo.name : '',
        avatar: user.profilePicture || user.avatar || '',
        department: user.department,
      },
      tenant: tenantInfo
        ? {
            id: tenantInfo._id,
            name: tenantInfo.name,
            tenantId: tenantInfo.tenantId,
            currency: tenantInfo.currency,
            defaultTaxRate: tenantInfo.defaultTaxRate,
            invoiceTerms: tenantInfo.invoiceTerms,
            address: tenantInfo.address || '',
            website: tenantInfo.website || '',
          }
        : null,
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

    const tenant = req.user.tenantId ? await Tenant.findOne({ tenantId: req.user.tenantId }) : null;

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
