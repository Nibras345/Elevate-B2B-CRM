import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { Lead } from '../models/Lead';
import { Invoice } from '../models/Invoice';
import { AuthRequest } from '../types';

/**
 * @route   GET /api/super-admin/dashboard-stats
 * @desc    Fetch platform-wide aggregated statistics across all tenants
 * @access  Private (Super Admin strictly)
 */
export const getSuperAdminDashboardStats = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Total Companies: Count distinct tenant documents or tenant IDs
    const tenantCount = await Tenant.countDocuments();
    const distinctUserTenants = (await User.distinct('tenantId')).filter(Boolean).length;
    const totalCompanies = Math.max(tenantCount, distinctUserTenants);

    // 2. Total Platform Users: Count all users across entire database
    const totalPlatformUsers = await User.countDocuments();

    // 3. Total Platform Revenue: Sum of all 'Won / Closed' leads (or Paid Invoices) across the entire database
    const [leadRevenueAgg, invoiceRevenueAgg] = await Promise.all([
      Lead.aggregate([
        {
          $match: {
            stage: { $in: ['Won / Closed', 'Won'] },
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $ifNull: ['$estimatedValue', { $ifNull: ['$value', 0] }],
              },
            },
          },
        },
      ]),
      Invoice.aggregate([
        {
          $match: {
            status: 'Paid',
          },
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: {
                $ifNull: ['$grandTotal', { $ifNull: ['$total', 0] }],
              },
            },
          },
        },
      ]),
    ]);

    const totalLeadsRevenue = leadRevenueAgg[0]?.total || 0;
    const totalInvoicesRevenue = invoiceRevenueAgg[0]?.total || 0;

    const totalPlatformRevenue =
      totalLeadsRevenue > 0 && totalInvoicesRevenue > 0
        ? totalLeadsRevenue + totalInvoicesRevenue
        : totalLeadsRevenue || totalInvoicesRevenue || 0;

    res.status(200).json({
      success: true,
      totalCompanies,
      totalPlatformUsers,
      totalPlatformRevenue,
      stats: {
        totalCompanies,
        totalPlatformUsers,
        totalPlatformRevenue,
        totalLeadsRevenue,
        totalInvoicesRevenue,
      },
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * @route   GET /api/super-admin/tenants
 * @desc    Fetch all registered companies/tenants with aggregated metrics
 * @access  Private (Super Admin strictly)
 */
export const getSuperAdminTenants = async (
  _req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Fetch all tenant documents
    const tenants = await Tenant.find().sort({ createdAt: -1 }).lean();

    // Synchronize any distinct tenantId from User not yet registered in Tenant collection
    const existingTenantCodes = new Set(tenants.map((t) => t.tenantId));
    const distinctUserTenantIds = await User.distinct('tenantId');

    for (const tId of distinctUserTenantIds) {
      if (tId && !existingTenantCodes.has(tId)) {
        const sampleUser = await User.findOne({ tenantId: tId });
        const autoTenant = await Tenant.create({
          name: (sampleUser as any)?.companyName || (sampleUser?.name ? `${sampleUser.name}'s Org` : `Workspace ${tId}`),
          tenantId: tId,
          currency: 'USD ($)',
          maxSeats: 25,
          status: 'Active',
        });
        tenants.push(autoTenant.toObject() as any);
        existingTenantCodes.add(tId);
      }
    }

    // 2. Aggregate details for each tenant
    const formattedTenants = await Promise.all(
      tenants.map(async (tenant) => {
        const tenantMongoId = tenant._id;
        const tenantCode = tenant.tenantId;

        // Admin Email: Find user with 'Company Admin' role for that specific tenant
        const adminUser = await User.findOne({
          $or: [
            { tenantId: tenantCode },
            { tenant: tenantMongoId },
            { tenantIds: tenantCode },
            { 'workspaces.tenantId': tenantCode },
          ],
          role: 'Company Admin',
        }).select('email name');

        let adminEmail = adminUser?.email;
        if (!adminEmail) {
          const fallbackUser = await User.findOne({
            $or: [
              { tenantId: tenantCode },
              { tenant: tenantMongoId },
              { tenantIds: tenantCode },
              { 'workspaces.tenantId': tenantCode },
            ],
          }).select('email');
          adminEmail = fallbackUser?.email || 'unassigned@domain.com';
        }

        // Seats Used: Count of users in that specific tenant
        const seatsUsed = await User.countDocuments({
          $or: [
            { tenantId: tenantCode },
            { tenant: tenantMongoId },
            { tenantIds: tenantCode },
            { 'workspaces.tenantId': tenantCode },
          ],
          isActive: { $ne: false },
        });

        const maxSeats = (tenant as any).seatLimit ?? tenant.maxSeats ?? 25;

        // Total Revenue: Sum of closed deals (Won / Closed leads or Paid Invoices) for that tenantId
        const [closedLeadsAgg, paidInvoicesAgg] = await Promise.all([
          Lead.aggregate([
            {
              $match: {
                $or: [{ tenantId: tenantMongoId }, { tenantCode: tenantCode }],
                stage: { $in: ['Won / Closed', 'Won'] },
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: { $ifNull: ['$estimatedValue', { $ifNull: ['$value', 0] }] } },
              },
            },
          ]),
          Invoice.aggregate([
            {
              $match: {
                tenantId: tenantMongoId,
                status: 'Paid',
              },
            },
            {
              $group: {
                _id: null,
                total: { $sum: { $ifNull: ['$grandTotal', { $ifNull: ['$total', 0] }] } },
              },
            },
          ]),
        ]);

        const leadRev = closedLeadsAgg[0]?.total || 0;
        const invRev = paidInvoicesAgg[0]?.total || 0;
        const totalRevenue = leadRev > 0 && invRev > 0 ? leadRev + invRev : leadRev || invRev || 0;

        return {
          id: tenantMongoId.toString(),
          _id: tenantMongoId.toString(),
          companyName: tenant.name,
          name: tenant.name,
          tenantId: tenantCode,
          adminEmail,
          seatsUsed,
          maxSeats,
          seatsDisplay: `${seatsUsed}/${maxSeats}`,
          totalRevenue,
          status: (tenant as any).status || 'Active',
          createdAt: tenant.createdAt,
        };
      })
    );

    res.status(200).json({
      success: true,
      tenants: formattedTenants,
      data: formattedTenants,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * @route   PATCH /api/super-admin/tenants/:id/status
 * @desc    Toggle or set tenant operational status (Active / Suspended)
 * @access  Private (Super Admin strictly)
 */
export const updateTenantStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    let targetTenant;
    if (mongoose.isValidObjectId(id)) {
      targetTenant = await Tenant.findById(id);
    } else {
      targetTenant = await Tenant.findOne({ tenantId: id });
    }

    if (!targetTenant) {
      res.status(404).json({
        success: false,
        message: 'Tenant / Company not found',
      });
      return;
    }

    const nextStatus = status || (targetTenant.status === 'Suspended' ? 'Active' : 'Suspended');
    targetTenant.status = nextStatus;
    await targetTenant.save();

    res.status(200).json({
      success: true,
      message: `Company status updated to ${nextStatus}`,
      tenant: targetTenant,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * @route   DELETE /api/super-admin/tenants/:id
 * @desc    Delete tenant and optionally cleanup resources
 * @access  Private (Super Admin strictly)
 */
export const deleteTenant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    let targetTenant;
    if (mongoose.isValidObjectId(id)) {
      targetTenant = await Tenant.findById(id);
    } else {
      targetTenant = await Tenant.findOne({ tenantId: id });
    }

    if (!targetTenant) {
      res.status(404).json({
        success: false,
        message: 'Tenant / Company not found',
      });
      return;
    }

    await Tenant.findByIdAndDelete(targetTenant._id);

    res.status(200).json({
      success: true,
      message: `Company ${targetTenant.name} (${targetTenant.tenantId}) has been successfully deleted`,
    });
  } catch (error: any) {
    next(error);
  }
};
