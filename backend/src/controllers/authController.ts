import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { Tenant } from '../models/Tenant';
import { Invitation } from '../models/Invitation';
import { AuthRequest, JwtPayload, UserRole } from '../types';

const isProduction = process.env.NODE_ENV === 'production';

// Cookie Options for Cross-Domain HttpOnly Authentication (Vercel <-> Render & Localhost)
export const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 15 * 60 * 1000, // 15 minutes
};

export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Generate Short-Lived Access Token (15m)
 */
export const generateAccessToken = (userId: string, email: string, role: UserRole, tenantId: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured in environment variables');
  }
  return jwt.sign(
    { userId, email, role, tenantId: tenantId || '' } as JwtPayload,
    secret,
    { expiresIn: '15m' }
  );
};

/**
 * Generate Long-Lived Refresh Token (7d)
 */
export const generateRefreshToken = (userId: string, email: string): string => {
  const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'crm_refresh_secret_key_2026';
  return jwt.sign(
    { userId, email },
    refreshSecret,
    { expiresIn: '7d' }
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

    // Generate Access Token (15m) and Refresh Token (7d)
    const accessToken = generateAccessToken(
      newUser._id.toString(),
      newUser.email,
      newUser.role,
      newUser.tenantId || ''
    );

    const refreshToken = generateRefreshToken(
      newUser._id.toString(),
      newUser.email
    );

    // Save refresh token to user document
    newUser.refreshToken = refreshToken;
    await newUser.save();

    // Set tokens in HttpOnly cookies (Cross-Domain secure)
    res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('token', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      message: userRole === 'Company Admin'
        ? `Tenant workspace provisioned successfully for ${tenantDoc?.name}.`
        : 'Employee account created successfully.',
      accessToken,
      token: accessToken,
      refreshToken,
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

    // Generate Access Token (15m) and Refresh Token (7d)
    const accessToken = generateAccessToken(
      user._id.toString(),
      user.email,
      user.role,
      user.tenantId || ''
    );

    const refreshToken = generateRefreshToken(
      user._id.toString(),
      user.email
    );

    // Save refresh token to user document in database
    user.refreshToken = refreshToken;
    await user.save();

    // Set both tokens in HttpOnly cookies (Cross-Domain secure)
    res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('token', accessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

    let tenantInfo: any = (user as any).tenant;
    if (!tenantInfo && user.tenantId) {
      tenantInfo = await Tenant.findOne({ tenantId: user.tenantId });
    }

    res.status(200).json({
      success: true,
      message: 'Signed in successfully.',
      accessToken,
      token: accessToken,
      refreshToken,
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
 * @route   POST /api/auth/refresh
 * @desc    Generate a new 15-minute access token using a valid refresh token
 * @access  Public (via HttpOnly refreshToken cookie or request body)
 */
export const refreshAccessToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tokenFromCookie = req.cookies?.refreshToken;
    const tokenFromBody = req.body?.refreshToken;
    const incomingToken = tokenFromCookie || tokenFromBody;

    if (!incomingToken) {
      res.status(401).json({
        success: false,
        message: 'Refresh token missing. Please sign in again.',
      });
      return;
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'crm_refresh_secret_key_2026';
    let decoded: any;
    try {
      decoded = jwt.verify(incomingToken, refreshSecret);
    } catch (err: any) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token. Please sign in again.',
      });
      return;
    }

    if (!decoded || !decoded.userId) {
      res.status(401).json({
        success: false,
        message: 'Malformed refresh token.',
      });
      return;
    }

    // Find the user with this exact refresh token in the database (ensures token has not been revoked)
    const user = await User.findOne({
      _id: decoded.userId,
      refreshToken: incomingToken,
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Refresh token revoked or user not found.',
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        message: 'Your account has been deactivated.',
      });
      return;
    }

    // Generate fresh 15-minute Access Token
    const newAccessToken = generateAccessToken(
      user._id.toString(),
      user.email,
      user.role,
      user.tenantId || ''
    );

    // Set as HttpOnly cookie
    res.cookie('accessToken', newAccessToken, ACCESS_COOKIE_OPTIONS);
    res.cookie('token', newAccessToken, ACCESS_COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      message: 'Access token refreshed successfully.',
      accessToken: newAccessToken,
      token: newAccessToken,
    });
  } catch (error) {
    console.error('[Refresh Token Error]:', error);
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
 * @desc    Logout user session, clear cookies, and remove refreshToken from database
 * @access  Public
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (incomingRefreshToken) {
      await User.findOneAndUpdate({ refreshToken: incomingRefreshToken }, { refreshToken: null });
    } else if ((req as any).user?._id) {
      await User.findByIdAndUpdate((req as any).user._id, { refreshToken: null });
    }
  } catch (err) {
    console.error('[Logout Invalidation Error]:', err);
  }

  // Clear all auth cookies with matching environment flags
  res.clearCookie('accessToken', {
    httpOnly: ACCESS_COOKIE_OPTIONS.httpOnly,
    secure: ACCESS_COOKIE_OPTIONS.secure,
    sameSite: ACCESS_COOKIE_OPTIONS.sameSite,
  });
  res.clearCookie('token', {
    httpOnly: ACCESS_COOKIE_OPTIONS.httpOnly,
    secure: ACCESS_COOKIE_OPTIONS.secure,
    sameSite: ACCESS_COOKIE_OPTIONS.sameSite,
  });
  res.clearCookie('refreshToken', {
    httpOnly: REFRESH_COOKIE_OPTIONS.httpOnly,
    secure: REFRESH_COOKIE_OPTIONS.secure,
    sameSite: REFRESH_COOKIE_OPTIONS.sameSite,
  });

  res.status(200).json({
    success: true,
    message: 'Signed out successfully.',
  });
};
