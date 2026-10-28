import mongoose, { Types } from 'mongoose';
import { Tenant } from '../models/Tenant';
import { AuthRequest } from '../types';

export interface TenantContext {
  tenantObjectId: Types.ObjectId;
  tenantCode: string;
}

/**
 * Resolves the authenticated user's current tenant context
 * Guarantees a valid Tenant ObjectId and string code for data isolation
 */
export const getTenantContext = async (req: AuthRequest): Promise<TenantContext> => {
  const rawTenantId = req.user?.tenantId || req.tenantId;

  if (!rawTenantId) {
    throw new Error('Tenant context missing from authenticated session');
  }

  // 1. Check if user already has a populated or attached tenant ObjectId
  let tenantDoc = null;
  const directTenantId = (req.user as any)?.tenant;
  if (directTenantId && mongoose.isValidObjectId(directTenantId)) {
    tenantDoc = await Tenant.findById(directTenantId);
  }

  // 2. Search by tenantId code (e.g. 'TNT-TOKY-8511')
  if (!tenantDoc) {
    tenantDoc = await Tenant.findOne({ tenantId: rawTenantId });
  }

  // 3. Search by _id if rawTenantId is an ObjectId
  if (!tenantDoc && mongoose.isValidObjectId(rawTenantId)) {
    tenantDoc = await Tenant.findById(rawTenantId);
  }

  if (tenantDoc) {
    return {
      tenantObjectId: tenantDoc._id as Types.ObjectId,
      tenantCode: tenantDoc.tenantId,
    };
  }

  // 4. Fallback: Create Tenant record if missing
  const newTenant = await Tenant.create({
    name: req.user?.companyName || 'Enterprise Workspace',
    tenantId: rawTenantId,
    currency: 'USD ($)',
    defaultTaxRate: 10,
    invoiceTerms: 'Net 30 Days',
    maxSeats: 25,
  });

  return {
    tenantObjectId: newTenant._id as Types.ObjectId,
    tenantCode: newTenant.tenantId,
  };
};
