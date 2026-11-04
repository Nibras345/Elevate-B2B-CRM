import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { Lead } from '../models/Lead';
import { Invoice } from '../models/Invoice';
import { AuthRequest } from '../types';

/**
 * @interface DashboardStatsResponse
 * Strictly typed API response contract for Super Admin Dashboard Telemetry
 */
export interface DashboardStatsResponse {
  success: boolean;
  totalRegisteredCompanies: number;
  totalActiveCompanies: number;
  globalPlatformRevenue: number;
  totalCompanies?: number;
  totalPlatformUsers?: number;
  stats?: {
    totalRegisteredCompanies: number;
    totalActiveCompanies: number;
    globalPlatformRevenue: number;
    totalCompanies: number;
    totalPlatformUsers: number;
    totalPlatformRevenue: number;
    totalLeadsRevenue: number;
    totalInvoicesRevenue: number;
  };
}

interface CompanyAggResult {
  _id: null;
  totalRegistered: number;
  totalActive: number;
}

interface RevenueAggResult {
  _id: null;
  total: number;
}

/**
 * @route   GET /api/super-admin/dashboard-stats
 * @desc    Fetch platform-wide aggregated statistics across all tenants with strict TypeScript typing
 * @access  Private (Super Admin strictly)
 */
export const getSuperAdminDashboardStats = async (
  _req: Request | AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Total Registered Companies & Total Active Companies:
    // Execute MongoDB Aggregation on Tenant collection
    const companyAgg = await Tenant.aggregate<CompanyAggResult>([
      {
        $group: {
          _id: null,
          totalRegistered: { $sum: 1 },
          totalActive: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Suspended'] }, 0, 1],
            },
          },
        },
      },
    ]);

    let totalRegisteredCompanies = companyAgg[0]?.totalRegistered ?? 0;
    let totalActiveCompanies = companyAgg[0]?.totalActive ?? 0;

    // Check distinct tenantId in User to ensure any newly provisioned workspace code is counted
    const distinctUserTenants = (await User.distinct('tenantId')).filter(Boolean).length;
    if (distinctUserTenants > totalRegisteredCompanies) {
      const difference = distinctUserTenants - totalRegisteredCompanies;
      totalRegisteredCompanies = distinctUserTenants;
      totalActiveCompanies += difference;
    }

    // 2. Global Platform Revenue:
    // Run MongoDB Aggregations to sum estimatedValue for all Leads where stage === 'Won / Closed' (and settled Paid Invoices)
    const [leadRevenueAgg, invoiceRevenueAgg] = await Promise.all([
      Lead.aggregate<RevenueAggResult>([
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
      Invoice.aggregate<RevenueAggResult>([
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

    // Absolute platform revenue across all companies
    const globalPlatformRevenue =
      totalLeadsRevenue > 0 && totalInvoicesRevenue > 0
        ? totalLeadsRevenue + totalInvoicesRevenue
        : totalLeadsRevenue || totalInvoicesRevenue || 0;

    const totalPlatformUsers = await User.countDocuments();

    const responsePayload: DashboardStatsResponse = {
      success: true,
      totalRegisteredCompanies,
      totalActiveCompanies,
      globalPlatformRevenue,
      totalCompanies: totalRegisteredCompanies,
      totalPlatformUsers,
      stats: {
        totalRegisteredCompanies,
        totalActiveCompanies,
        globalPlatformRevenue,
        totalCompanies: totalRegisteredCompanies,
        totalPlatformUsers,
        totalPlatformRevenue: globalPlatformRevenue,
        totalLeadsRevenue,
        totalInvoicesRevenue,
      },
    };

    res.status(200).json(responsePayload);
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

    // 2. Pre-aggregate dynamic revenue across all tenants in real-time (Lead Won + Invoice Paid)
    const [leadsByTenant, invoicesByTenant] = await Promise.all([
      Lead.aggregate([
        {
          $match: {
            stage: { $in: ['Won / Closed', 'Won'] },
          },
        },
        {
          $group: {
            _id: '$tenantId',
            totalRevenue: {
              $sum: { $ifNull: ['$estimatedValue', { $ifNull: ['$value', 0] }] },
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
            _id: '$tenantId',
            totalRevenue: {
              $sum: { $ifNull: ['$grandTotal', { $ifNull: ['$total', 0] }] },
            },
          },
        },
      ]),
    ]);

    // Build real-time revenue lookup map covering both ObjectId and string tenant codes
    const revenueMap = new Map<string, number>();
    for (const item of leadsByTenant) {
      if (item._id) {
        const key = item._id.toString();
        revenueMap.set(key, (revenueMap.get(key) || 0) + (item.totalRevenue || 0));
      }
    }
    for (const item of invoicesByTenant) {
      if (item._id) {
        const key = item._id.toString();
        revenueMap.set(key, (revenueMap.get(key) || 0) + (item.totalRevenue || 0));
      }
    }

    // 3. Aggregate details for each tenant
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

        // Real-time Dynamic Total Revenue: Match both ObjectId and tenantCode
        const mongoIdStr = tenantMongoId.toString();
        const tenantCodeStr = tenantCode;
        const totalRevenue =
          (revenueMap.get(mongoIdStr) || 0) +
          (tenantCodeStr && tenantCodeStr !== mongoIdStr ? (revenueMap.get(tenantCodeStr) || 0) : 0);

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
