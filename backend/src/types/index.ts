import { Request } from 'express';
import { Types } from 'mongoose';

export type UserRole = 'Company Admin' | 'Employee' | 'Sales Agent' | 'Support' | 'Super Admin';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  tenantId: string;
}

export interface UserWorkspace {
  tenantId: string;
  tenant?: Types.ObjectId | string;
  role: UserRole;
  department?: string;
  status: 'Invited' | 'Active';
  joinedAt?: Date;
}

export interface AuthenticatedUser {
  id?: string;
  _id: Types.ObjectId | string;
  name: string;
  fullName?: string;
  email: string;
  role: UserRole;
  tenantId: string;
  tenantIds?: string[];
  workspaces?: UserWorkspace[];
  companyName?: string;
  avatar?: string;
  profilePicture?: string;
  phone?: string;
  department?: string;
  isActive: boolean;
  status?: 'Invited' | 'Active';
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  tenantId?: string;
}
