import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { AuthRequest, JwtPayload, UserRole } from '../types';

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication token missing. Please sign in to access this resource.',
      });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured in environment variables');
    }
    const decoded = jwt.verify(token, secret) as JwtPayload;

    const currentUser = await User.findById(decoded.userId).populate('tenant');

    if (!currentUser) {
      res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.',
      });
      return;
    }

    if (!currentUser.isActive) {
      res.status(403).json({
        success: false,
        message: 'This account has been deactivated. Please contact your company admin.',
      });
      return;
    }

    // Attach user and tenant info to request
    req.user = {
      _id: currentUser._id,
      name: currentUser.name,
      email: currentUser.email,
      role: currentUser.role,
      tenantId: currentUser.tenantId,
      companyName: (currentUser as any).tenant?.name,
      avatar: currentUser.avatar,
      department: currentUser.department,
      isActive: currentUser.isActive,
    };
    req.tenantId = currentUser.tenantId;

    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token. Please sign in again.',
      error: error.message,
    });
  }
};

/**
 * Role-Based Access Control (RBAC) Guard
 * Restricts route access to specified roles
 */
export const authorizeRoles = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden: User role '${req.user?.role || 'Guest'}' is not authorized to perform this action.`,
      });
      return;
    }
    next();
  };
};

/**
 * Tenant Isolation Guard
 * Ensures queries never leak data across tenants
 */
export const tenantGuard = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.tenantId) {
    res.status(400).json({
      success: false,
      message: 'Multi-tenant context is required for this operation.',
    });
    return;
  }
  next();
};
