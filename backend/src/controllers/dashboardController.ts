import { Response, NextFunction } from 'express';
import { Invoice } from '../models/Invoice';
import { Lead } from '../models/Lead';
import { Client } from '../models/Client';
import { Tenant } from '../models/Tenant';
import { AuthRequest } from '../types';
import { getTenantContext } from '../utils/tenantHelper';

/**
 * Format currency in USD (e.g., $1,057,000)
 */
const formatUSD = (val: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(val || 0);
};

/**
 * Helper to produce human-friendly relative time strings
 */
const formatRelativeTime = (dateInput: Date | string): string => {
  const date = new Date(dateInput);
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * @route   GET /api/dashboard/stats
 * @desc    Fetch real-time aggregated executive dashboard metrics for authenticated tenant
 * @access  Private (JWT Protected)
 */
export const getDashboardStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // 1. Strict Tenant Context Resolution
    const { tenantObjectId, tenantCode } = await getTenantContext(req);

    // ==========================================
    // A) TOP METRICS
    // ==========================================
    // 1. TOTAL REVENUE: Sum of grandTotal from Invoice where status is 'Paid'
    const revenueAggregation = await Invoice.aggregate([
      {
        $match: {
          tenantId: tenantObjectId,
          status: 'Paid',
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $ifNull: ['$grandTotal', { $ifNull: ['$total', 0] }],
            },
          },
        },
      },
    ]);
    const totalRevenue = revenueAggregation.length > 0 ? (revenueAggregation[0].totalRevenue || 0) : 0;

    // 2. ACTIVE LEADS: Count of Lead where stage is NOT 'Won / Closed'
    const activeLeadsCount = await Lead.countDocuments({
      tenantId: tenantObjectId,
      stage: { $nin: ['Won / Closed', 'Won'] },
    });

    // 3. DEALS CLOSED: Count of Lead where stage is 'Won / Closed'
    const dealsClosedCount = await Lead.countDocuments({
      tenantId: tenantObjectId,
      stage: { $in: ['Won / Closed', 'Won'] },
    });

    // 4. CONVERSION RATE: (DEALS CLOSED / Total Leads) * 100
    const totalLeadsCount = await Lead.countDocuments({
      tenantId: tenantObjectId,
    });

    const conversionRate = totalLeadsCount > 0
      ? Number(((dealsClosedCount / totalLeadsCount) * 100).toFixed(1))
      : 0;

    // Real Period-over-Period Calculations
    const now = new Date();

    // 1. Month boundaries for current & previous period
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Revenue current month vs previous month
    const [currMonthPaidAgg, prevMonthPaidAgg] = await Promise.all([
      Invoice.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            status: 'Paid',
            $expr: {
              $gte: [{ $ifNull: ['$issueDate', '$createdAt'] }, startOfCurrentMonth],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: { $ifNull: ['$grandTotal', { $ifNull: ['$total', 0] }] } },
          },
        },
      ]),
      Invoice.aggregate([
        {
          $match: {
            tenantId: tenantObjectId,
            status: 'Paid',
            $expr: {
              $and: [
                { $gte: [{ $ifNull: ['$issueDate', '$createdAt'] }, startOfPrevMonth] },
                { $lte: [{ $ifNull: ['$issueDate', '$createdAt'] }, endOfPrevMonth] },
              ],
            },
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

    const currMonthRev = currMonthPaidAgg.length > 0 ? (currMonthPaidAgg[0].total || 0) : 0;
    const prevMonthRev = prevMonthPaidAgg.length > 0 ? (prevMonthPaidAgg[0].total || 0) : 0;

    let revChangePercent = 0;
    if (prevMonthRev > 0) {
      revChangePercent = Number((((currMonthRev - prevMonthRev) / prevMonthRev) * 100).toFixed(1));
    } else if (currMonthRev > 0) {
      revChangePercent = 100;
    }

    // Active Leads current month vs previous month
    const [currMonthActiveLeads, prevMonthActiveLeads] = await Promise.all([
      Lead.countDocuments({
        tenantId: tenantObjectId,
        stage: { $nin: ['Won / Closed', 'Won'] },
        createdAt: { $gte: startOfCurrentMonth },
      }),
      Lead.countDocuments({
        tenantId: tenantObjectId,
        stage: { $nin: ['Won / Closed', 'Won'] },
        createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth },
      }),
    ]);

    let leadsChangePercent = 0;
    if (prevMonthActiveLeads > 0) {
      leadsChangePercent = Number((((currMonthActiveLeads - prevMonthActiveLeads) / prevMonthActiveLeads) * 100).toFixed(1));
    } else if (currMonthActiveLeads > 0) {
      leadsChangePercent = 100;
    }

    // Deals Closed current quarter vs previous quarter
    const currentQuarterIndex = Math.floor(now.getMonth() / 3);
    const startOfCurrentQuarter = new Date(now.getFullYear(), currentQuarterIndex * 3, 1);
    const startOfPrevQuarter = new Date(now.getFullYear(), (currentQuarterIndex - 1) * 3, 1);
    const endOfPrevQuarter = new Date(now.getFullYear(), currentQuarterIndex * 3, 0, 23, 59, 59, 999);

    const [currQuarterDeals, prevQuarterDeals] = await Promise.all([
      Lead.countDocuments({
        tenantId: tenantObjectId,
        stage: { $in: ['Won / Closed', 'Won'] },
        $expr: {
          $gte: [{ $ifNull: ['$updatedAt', '$createdAt'] }, startOfCurrentQuarter],
        },
      }),
      Lead.countDocuments({
        tenantId: tenantObjectId,
        stage: { $in: ['Won / Closed', 'Won'] },
        $expr: {
          $and: [
            { $gte: [{ $ifNull: ['$updatedAt', '$createdAt'] }, startOfPrevQuarter] },
            { $lte: [{ $ifNull: ['$updatedAt', '$createdAt'] }, endOfPrevQuarter] },
          ],
        },
      }),
    ]);

    let dealsChangePercent = 0;
    if (prevQuarterDeals > 0) {
      dealsChangePercent = Number((((currQuarterDeals - prevQuarterDeals) / prevQuarterDeals) * 100).toFixed(1));
    } else if (currQuarterDeals > 0) {
      dealsChangePercent = 100;
    }

    // Conversion rate current month vs previous month
    const [currTotalLeads, currWonLeads, prevTotalLeads, prevWonLeads] = await Promise.all([
      Lead.countDocuments({ tenantId: tenantObjectId, createdAt: { $gte: startOfCurrentMonth } }),
      Lead.countDocuments({ tenantId: tenantObjectId, stage: { $in: ['Won / Closed', 'Won'] }, createdAt: { $gte: startOfCurrentMonth } }),
      Lead.countDocuments({ tenantId: tenantObjectId, createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } }),
      Lead.countDocuments({ tenantId: tenantObjectId, stage: { $in: ['Won / Closed', 'Won'] }, createdAt: { $gte: startOfPrevMonth, $lte: endOfPrevMonth } }),
    ]);

    const currConv = currTotalLeads > 0 ? (currWonLeads / currTotalLeads) * 100 : conversionRate;
    const prevConv = prevTotalLeads > 0 ? (prevWonLeads / prevTotalLeads) * 100 : 0;
    const convDiff = Number((currConv - prevConv).toFixed(1));

    // Formatted Top Metrics and Dynamic KPI Cards
    const topMetrics = {
      totalRevenue,
      totalRevenueFormatted: formatUSD(totalRevenue),
      activeLeads: activeLeadsCount,
      dealsClosed: dealsClosedCount,
      totalLeads: totalLeadsCount,
      conversionRate,
      conversionRateFormatted: `${conversionRate}%`,
    };

    const kpis = [
      {
        id: 'kpi-rev',
        title: 'Total Revenue',
        value: formatUSD(totalRevenue),
        rawValue: totalRevenue,
        change: `${revChangePercent >= 0 ? '+' : ''}${revChangePercent}%`,
        period: 'vs last month',
        isPositive: revChangePercent >= 0,
        color: 'indigo',
      },
      {
        id: 'kpi-leads',
        title: 'Active Leads',
        value: activeLeadsCount.toLocaleString(),
        rawValue: activeLeadsCount,
        change: `${leadsChangePercent >= 0 ? '+' : ''}${leadsChangePercent}%`,
        period: 'vs last month',
        isPositive: leadsChangePercent >= 0,
        color: 'emerald',
      },
      {
        id: 'kpi-deals',
        title: 'Deals Closed',
        value: dealsClosedCount.toLocaleString(),
        rawValue: dealsClosedCount,
        change: `${dealsChangePercent >= 0 ? '+' : ''}${dealsChangePercent}%`,
        period: 'vs last quarter',
        isPositive: dealsChangePercent >= 0,
        color: 'amber',
      },
      {
        id: 'kpi-conv',
        title: 'Conversion Rate',
        value: `${conversionRate}%`,
        rawValue: conversionRate,
        change: `${convDiff >= 0 ? '+' : ''}${convDiff}%`,
        period: 'vs last month',
        isPositive: convDiff >= 0,
        color: 'purple',
      },
    ];

    // ==========================================
    // B) REVENUE PERFORMANCE & TARGETS
    // ==========================================
    // Group paid invoices by month for the authenticated tenant
    const monthlyPaidInvoices = await Invoice.aggregate([
      {
        $match: {
          tenantId: tenantObjectId,
          status: 'Paid',
        },
      },
      {
        $group: {
          _id: {
            year: { $year: { $ifNull: ['$issueDate', '$createdAt'] } },
            month: { $month: { $ifNull: ['$issueDate', '$createdAt'] } },
          },
          totalAmount: {
            $sum: {
              $ifNull: ['$grandTotal', { $ifNull: ['$total', 0] }],
            },
          },
        },
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
        },
      },
    ]);

    // Build standard 12-month rolling timeline
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const timelineMonths: { year: number; month: number; name: string }[] = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      timelineMonths.push({
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        name: monthNames[d.getMonth()],
      });
    }

    // Dynamic target quota: fetch from TenantSettings / Tenant model or default strictly to zeroes
    const tenantDoc = await Tenant.findById(tenantObjectId).lean();
    const configuredQuotas = (tenantDoc as any)?.monthlyTargets || (tenantDoc as any)?.targetQuotas || [];

    const monthlyRevenue = timelineMonths.map((m, index) => {
      const found = monthlyPaidInvoices.find(
        (agg) => agg._id.year === m.year && agg._id.month === m.month
      );
      const revenue = found ? Math.round(found.totalAmount) : 0;
      const target = Array.isArray(configuredQuotas) && configuredQuotas[index] !== undefined
        ? Number(configuredQuotas[index]) || 0
        : 0;

      return {
        month: m.name,
        year: m.year,
        revenue,
        target,
        actual: revenue,
      };
    });

    const actual_revenue = monthlyRevenue.map((d) => d.revenue);
    const target_quota = monthlyRevenue.map((d) => d.target);

    // ==========================================
    // C) LEADS BY PIPELINE STAGE
    // ==========================================
    // Group active leads by stage, calculate deal count and sum of estimatedValue
    const activeLeadStagesAgg = await Lead.aggregate([
      {
        $match: {
          tenantId: tenantObjectId,
          stage: { $nin: ['Won / Closed', 'Won'] },
        },
      },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          sum: { $sum: { $ifNull: ['$estimatedValue', 0] } },
        },
      },
    ]);

    const stageConfig: { stage: string; color: string; alias?: string }[] = [
      { stage: 'New Lead', color: 'bg-slate-400' },
      { stage: 'Contacted', color: 'bg-blue-500' },
      { stage: 'Proposal Sent', color: 'bg-indigo-500' },
      { stage: 'Negotiation', color: 'bg-amber-500' },
      { stage: 'Won / Closed', color: 'bg-emerald-500', alias: 'Won' },
    ];

    // Compute totalPipelineValue as the sum of all active stages
    let totalPipelineValue = 0;
    const stageMap = new Map<string, { count: number; sum: number }>();

    activeLeadStagesAgg.forEach((item) => {
      const stageName = item._id || 'New Lead';
      stageMap.set(stageName, {
        count: item.count || 0,
        sum: item.sum || 0,
      });
      totalPipelineValue += item.sum || 0;
    });

    // Also get Won/Closed deals info to display complete stage distribution
    const wonLeadStage = await Lead.aggregate([
      {
        $match: {
          tenantId: tenantObjectId,
          stage: { $in: ['Won / Closed', 'Won'] },
        },
      },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          sum: { $sum: { $ifNull: ['$estimatedValue', 0] } },
        },
      },
    ]);

    wonLeadStage.forEach((item) => {
      stageMap.set('Won / Closed', {
        count: item.count || 0,
        sum: item.sum || 0,
      });
      stageMap.set('Won', {
        count: item.count || 0,
        sum: item.sum || 0,
      });
    });

    const stageFunnel = stageConfig.map((sc) => {
      const record = stageMap.get(sc.stage) || (sc.alias ? stageMap.get(sc.alias) : null) || { count: 0, sum: 0 };
      const percentage = totalPipelineValue > 0
        ? Math.round((record.sum / totalPipelineValue) * 100)
        : (record.count > 0 ? 20 : 0);

      return {
        stage: sc.stage,
        count: record.count,
        sum: record.sum,
        numericValue: record.sum,
        value: formatUSD(record.sum),
        percentage: Math.min(100, Math.max(0, percentage)),
        color: sc.color,
      };
    });

    // ==========================================
    // D) RECENT ACTIVITIES FEED
    // ==========================================
    // Fetch latest 10 records combining recent Leads, Invoices, and Clients
    const [recentLeads, recentInvoices, recentClients] = await Promise.all([
      Lead.find({ tenantId: tenantObjectId })
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(10)
        .lean(),
      Invoice.find({ tenantId: tenantObjectId })
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(10)
        .lean(),
      Client.find({ tenantId: tenantObjectId })
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const leadActivities = recentLeads.map((lead: any) => {
      const date = new Date(lead.updatedAt || lead.createdAt || Date.now());
      const isWon = lead.stage === 'Won / Closed' || lead.stage === 'Won';
      return {
        id: `act-lead-${lead._id}`,
        user: lead.assignedTo?.name || lead.contactName || 'Sales Agent',
        avatar: lead.assignedTo?.avatar || '',
        action: isWon ? 'closed deal for' : (lead.lastActivity || `advanced opportunity in ${lead.stage}`),
        target: lead.companyName || lead.company || lead.contactName || 'Enterprise Lead',
        value: formatUSD(lead.estimatedValue || 0),
        timestamp: date.getTime(),
        time: formatRelativeTime(date),
        type: isWon ? 'deal' : 'lead',
      };
    });

    const invoiceActivities = recentInvoices.map((inv: any) => {
      const date = new Date(inv.updatedAt || inv.issueDate || inv.createdAt || Date.now());
      const isPaid = inv.status === 'Paid';
      return {
        id: `act-inv-${inv._id}`,
        user: inv.clientName || 'Finance Dept',
        avatar: inv.avatar || '',
        action: isPaid
          ? `received payment for ${inv.invoiceNumber || 'Invoice'}`
          : `generated invoice ${inv.invoiceNumber || 'Invoice'}`,
        target: inv.company || inv.clientName || 'Enterprise Client',
        value: formatUSD(inv.grandTotal ?? inv.total ?? 0),
        timestamp: date.getTime(),
        time: formatRelativeTime(date),
        type: isPaid ? 'deal' : 'invoice',
      };
    });

    const clientActivities = recentClients.map((client: any) => {
      const date = new Date(client.convertedAt || client.createdAt || Date.now());
      return {
        id: `act-client-${client._id}`,
        user: client.contactName || 'Onboarding Team',
        avatar: client.avatar || '',
        action: client.lastContacted || 'onboarded new enterprise client',
        target: client.companyName || client.company || client.contactName || 'Valued Client',
        value: formatUSD(client.lifetimeValue || 0),
        timestamp: date.getTime(),
        time: formatRelativeTime(date),
        type: 'client',
      };
    });

    // Combine, sort by date descending, and take latest 10
    const recentActivities = [...leadActivities, ...invoiceActivities, ...clientActivities]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    // ==========================================
    // RETURN AGGREGATED DASHBOARD OBJECT
    // ==========================================
    res.status(200).json({
      success: true,
      tenantId: tenantCode,
      topMetrics,
      kpis,
      actual_revenue,
      target_quota,
      monthlyRevenue,
      revenuePerformance: {
        actual_revenue,
        target_quota,
        monthlyRevenue,
      },
      leadsByStage: stageFunnel,
      stageFunnel,
      totalPipelineValue,
      totalPipelineValueFormatted: formatUSD(totalPipelineValue),
      recentActivities,
    });
  } catch (error) {
    next(error);
  }
};

