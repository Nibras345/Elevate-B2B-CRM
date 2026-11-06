import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Tenant } from '../models/Tenant';
import { User } from '../models/User';
import { Lead } from '../models/Lead';
import { Invoice } from '../models/Invoice';
import { Client } from '../models/Client';
import { SeatRequest } from '../models/SeatRequest';
import { Notification } from '../models/Notification';
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

    const totalRegisteredCompanies = companyAgg[0]?.totalRegistered ?? 0;
    const totalActiveCompanies = companyAgg[0]?.totalActive ?? 0;

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
    // 1. Fetch all registered tenant documents
    const tenants = await Tenant.find().sort({ createdAt: -1 }).lean();

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

        const maxSeats = (tenant as any).seatLimit ?? tenant.maxSeats ?? 5;

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
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status } = req.body;

    // 1. Identifier Resolution: Try finding by custom string tenantId first
    let targetTenant = await Tenant.findOne({ tenantId: id });

    // Fallback: If not found, attempt finding by MongoDB ObjectId if valid
    if (!targetTenant && typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
      targetTenant = await Tenant.findById(id);
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
 * @desc    Delete tenant and cascadingly cleanup all associated resources with strict schema typing
 * @access  Private (Super Admin strictly)
 */
export const deleteTenant = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    // 1. Identifier Resolution: Try finding by custom string tenantId first
    let tenant = await Tenant.findOne({ tenantId: id });

    // Fallback: If not found, attempt finding by MongoDB ObjectId if valid
    if (!tenant && typeof id === 'string' && mongoose.Types.ObjectId.isValid(id)) {
      tenant = await Tenant.findById(id);
    }

    // If still not found, return 404
    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Tenant / Company not found',
      });
      return;
    }

    const tenantObjectId = tenant._id;
    const tenantCode = tenant.tenantId;

    // 2. Cascading Deletions: Match exact schema types to prevent Mongoose CastErrors
    // - SeatRequest references tenantId as Schema.Types.ObjectId
    await SeatRequest.deleteMany({ tenantId: tenantObjectId });

    // - Lead references tenantId as Schema.Types.ObjectId
    await Lead.deleteMany({
      $or: [{ tenantId: tenantObjectId }, { tenantCode }],
    });

    // - Client references tenantId as Mixed / ObjectId
    await Client.deleteMany({
      $or: [{ tenantId: tenantObjectId }, { tenantCode }, { tenantId: tenantCode as any }],
    });

    // - Invoice references tenantId as Schema.Types.ObjectId
    await Invoice.deleteMany({ tenantId: tenantObjectId });

    // - Notification references tenantId as Schema.Types.ObjectId
    await Notification.deleteMany({
      $or: [{ tenantId: tenantObjectId }, { tenantCode }],
    });

    // - User references tenantId as String and tenant as Schema.Types.ObjectId
    await User.deleteMany({
      $or: [
        { tenantId: tenantCode },
        { tenant: tenantObjectId },
        { tenantIds: tenantCode },
        { tenants: tenantObjectId },
        { 'workspaces.tenantId': tenantCode },
        { 'workspaces.tenant': tenantObjectId },
      ],
    });

    // 3. Finally, delete the tenant document itself
    await Tenant.findByIdAndDelete(tenantObjectId);

    res.status(200).json({
      success: true,
      message: `Company ${tenant.name} (${tenantCode}) has been successfully deleted`,
    });
  } catch (error: any) {
    next(error);
  }
};
