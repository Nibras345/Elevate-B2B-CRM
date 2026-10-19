import { Request } from 'express';
import { Types } from 'mongoose';

export type UserRole = 'Company Admin' | 'Employee' | 'Sales Agent' | 'Support' | 'Super Admin';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  tenantId: string;
}

export interface AuthenticatedUser {
  _id: Types.ObjectId | string;
  name: string;
  email: string;
  role: UserRole;
  tenantId: string;
  companyName?: string;
  avatar?: string;
  department?: string;
  isActive: boolean;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  tenantId?: string;
}
