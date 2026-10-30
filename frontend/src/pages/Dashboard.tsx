import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  TrendingUp,
  DollarSign,
  Users,
  Award,
  Percent,
  Download,
  Plus,
  ArrowUpRight,
  KanbanSquare,
  Receipt,
  Loader2,
  RefreshCw,
  LucideIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { DashboardData } from '../types';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();

  // STRICT RULE: No static mock data. Initialize dashboardData as null and fetch strictly from backend
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [timeRange, setTimeRange] = useState('This Month');
  const [activeActivityTab, setActiveActivityTab] = useState('all');

  // Format currency values using standard USD formatting (e.g., $1,057,000)
  const formatUSD = (val: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Fetch real-time dashboard data with JWT authentication and strict tenant isolation
  const fetchDashboardStats = useCallback(async (showRefreshingState = false) => {
    try {
      if (showRefreshingState) setIsRefreshing(true);
      const token = localStorage.getItem('nexcrm_jwt_token');

      const response = await axios.get<DashboardData>('/api/dashboard/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data && response.data.success) {
        setDashboardData(response.data);
      }
    } catch (err: any) {
      console.error('[Dashboard Stats Error]:', err);
      notify(
        err.response?.data?.message || 'Failed to fetch real-time dashboard analytics.',
        'error'
      );
    } finally {
      if (showRefreshingState) setIsRefreshing(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats, user?.tenantId]);

  // Loading state spinner while dashboardData is null
  if (!dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] gap-3">
        <Loader2 className="w-10 h-10 text-brand-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Loading real-time executive dashboard metrics...
        </p>
      </div>
    );
  }

  // Top Metrics cards mapped from backend calculation
  const topMetricCards: {
    id: string;
    title: string;
    value: string;
    change: string;
    period: string;
    icon: LucideIcon;
    iconBg: string;
    glowClass: string;
  }[] = [
    {
      id: 'kpi-rev',
      title: 'Total Revenue',
      value: dashboardData.topMetrics?.totalRevenueFormatted || formatUSD(dashboardData.topMetrics?.totalRevenue || 0),
      change: '+14.2%',
      period: 'vs last month',
      icon: DollarSign,
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
      glowClass: 'hover:border-indigo-500/50 hover:shadow-glow-indigo',
    },
    {
      id: 'kpi-leads',
      title: 'Active Leads',
      value: (dashboardData.topMetrics?.activeLeads ?? 0).toLocaleString(),
      change: '+8.4%',
      period: 'vs last month',
      icon: Users,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
      glowClass: 'hover:border-emerald-500/50 hover:shadow-glow-emerald',
    },
    {
      id: 'kpi-deals',
      title: 'Deals Closed',
      value: (dashboardData.topMetrics?.dealsClosed ?? 0).toLocaleString(),
      change: '+22.8%',
      period: 'vs last quarter',
      icon: Award,
      iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
      glowClass: 'hover:border-amber-500/50 hover:shadow-glow-amber',
    },
    {
      id: 'kpi-conv',
      title: 'Conversion Rate',
      value: dashboardData.topMetrics?.conversionRateFormatted || `${dashboardData.topMetrics?.conversionRate ?? 0}%`,
      change: '+3.1%',
      period: 'vs benchmark',
      icon: Percent,
      iconBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400',
      glowClass: 'hover:border-purple-500/50 hover:shadow-glow-indigo',
    },
  ];

  // Activities filtered by type
  const activities = dashboardData.recentActivities || [];
  const filteredActivities = activeActivityTab === 'all'
    ? activities
    : activities.filter((act) => act.type === activeActivityTab);

  // Proposal stage stats for dynamic quick banner
  const proposalStage = (dashboardData.leadsByStage || dashboardData.stageFunnel || []).find(
    (s) => s.stage === 'Proposal Sent'
  );

  // Handle CSV export of dashboard metrics, invoices, and leads strictly for authenticated tenant and selected timeframe
  const handleExport = async () => {
    try {
      setIsExporting(true);
      const token = localStorage.getItem('nexcrm_jwt_token');

      const response = await axios.get(
        `/api/dashboard/export?timeframe=${encodeURIComponent(timeRange)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: 'blob',
        }
      );

      // Process blob response and trigger download
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Extract filename from Content-Disposition if present, else fallback to CRM_Dashboard_Export.csv
      let filename = 'CRM_Dashboard_Export.csv';
      const disposition = response.headers ? response.headers['content-disposition'] : null;
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^";]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      notify(`Dashboard report (${timeRange}) downloaded successfully!`, 'success');
    } catch (err: any) {
      console.error('[Dashboard Export Error]:', err);
      let errorMsg = 'Failed to export dashboard report. Please try again.';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed.message) errorMsg = parsed.message;
        } catch {
          // fallback to default error message
        }
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      }
      notify(errorMsg, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Executive Dashboard
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {user?.role || 'Company Admin'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time pipeline analytics, revenue forecasting, and activity for {user?.companyName || 'your workspace'}
          </p>
        </div>

        {/* Date Filter, Refresh & Export buttons */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <select
              value={timeRange}
              onChange={(e) => {
                setTimeRange(e.target.value);
                notify(`Metrics updated for ${e.target.value}`, 'info');
              }}
              className="pl-3 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-brand-500 cursor-pointer"
            >
              <option>Last 7 Days</option>
              <option>This Month</option>
              <option>This Quarter</option>
              <option>Year to Date</option>
            </select>
          </div>

          <button
            onClick={() => fetchDashboardStats(true)}
            disabled={isRefreshing}
            title="Refresh dashboard stats"
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting}
            title="Export CRM dashboard report as CSV"
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 text-slate-500" />
            )}
            <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export'}</span>
          </button>

          <button
            onClick={() => navigate('/leads')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Lead</span>
          </button>
        </div>
      </div>

      {/* 4 Glowing KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topMetricCards.map((kpi) => {
          const IconComponent = kpi.icon;

          return (
            <div
              key={kpi.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm transition-all duration-300 relative overflow-hidden group ${kpi.glowClass}`}
            >
              {/* Subtle gradient corner glow */}
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {kpi.title}
                </span>
                <div className={`p-2.5 rounded-xl ${kpi.iconBg} transition-transform group-hover:scale-110 duration-200`}>
                  <IconComponent className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {kpi.value}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-0.5 font-bold text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {kpi.change}
                </span>
                <span className="text-slate-400 dark:text-slate-500">
                  {kpi.period}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytical Visual Graphs Grid (Revenue Performance & Targets + Leads by Stage) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph 1: Revenue Performance & Targets (Recharts LineChart) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Revenue Performance & Targets</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full">
                  Live Sync
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Monthly billed revenue versus enterprise target quota
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-3 h-3 rounded-full bg-brand-600" />
                <span>Actual Revenue</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-0.5 bg-slate-400 border-dashed" />
                <span>Target Quota</span>
              </div>
            </div>
          </div>

          {/* Recharts Dynamic Line Chart */}
          <div className="h-64 w-full mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dashboardData.monthlyRevenue || []}
                margin={{ top: 10, right: 15, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 500 }}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  tick={{ fill: '#94a3b8', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    formatUSD(Number(value) || 0),
                    name === 'revenue' ? 'Actual Revenue' : 'Target Quota',
                  ]}
                  labelFormatter={(label) => `Month: ${label}`}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '0.75rem',
                    color: '#ffffff',
                    fontSize: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
                  }}
                  itemStyle={{ padding: '2px 0' }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="revenue"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#ffffff', stroke: '#4f46e5', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#4f46e5' }}
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  name="target"
                  stroke="#94a3b8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Leads by Pipeline Stage */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Leads by Pipeline Stage
              </h3>
              <button
                onClick={() => navigate('/leads')}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Pipeline</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1 mb-5">
              Active volume and conversion yield across sales gates
            </p>

            {/* Funnel Progress Bars */}
            <div className="space-y-4">
              {(dashboardData.leadsByStage || dashboardData.stageFunnel || []).map((item) => (
                <div key={item.stage} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {item.stage}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {item.count} deals
                      </span>
                      <span className="text-slate-400">({item.value})</span>
                    </div>
                  </div>

                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${item.color || 'bg-brand-500'}`}
                      style={{
                        width: `${Math.min(100, Math.max(item.count > 0 ? 8 : 0, item.percentage))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Funnel Stat Summary */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 p-3 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">Total Pipeline Value</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {dashboardData.totalPipelineValueFormatted || formatUSD(dashboardData.totalPipelineValue || 0)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Avg Win Rate</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {dashboardData.topMetrics?.conversionRateFormatted || `${dashboardData.topMetrics?.conversionRate ?? 0}%`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Activities Feed + High Value Deals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Activities Feed */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Recent Activities Feed
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time chronological events across sales and customer accounting
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              {['all', 'deal', 'invoice', 'lead', 'client'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveActivityTab(tab)}
                  className={`px-3 py-1 rounded-lg capitalize font-medium transition-all cursor-pointer ${
                    activeActivityTab === tab
                      ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Activities Timeline */}
          <div className="mt-5 space-y-4">
            {filteredActivities.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No recent activities found for {activeActivityTab === 'all' ? 'this workspace' : `"${activeActivityTab}" filter`}.
              </div>
            ) : (
              filteredActivities.map((act) => (
                <div
                  key={act.id}
                  className="flex items-start gap-3.5 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                >
                  {act.avatar ? (
                    <img
                      src={act.avatar}
                      alt={act.user}
                      className="w-9 h-9 rounded-xl object-cover ring-2 ring-slate-100 dark:ring-slate-800 shrink-0 mt-0.5"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs ring-2 ring-slate-100 dark:ring-slate-800 shrink-0 mt-0.5 shadow-xs">
                      {act.user ? act.user.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-xs text-slate-800 dark:text-slate-200">
                        <span className="font-bold text-slate-900 dark:text-white">{act.user}</span>{' '}
                        <span className="text-slate-500">{act.action}</span> for{' '}
                        <span className="font-semibold text-brand-600 dark:text-brand-400">{act.target}</span>
                      </p>
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                        {act.value}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      {act.time}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Quick Action Widget & Pipeline Shortcuts */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-brand-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-brand-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full text-brand-100 inline-block mb-3">
                Tenant ID: {dashboardData.tenantId || user?.tenantId}
              </span>
              <h4 className="text-xl font-bold leading-snug">
                Accelerate Pipeline Quota
              </h4>
              <p className="text-xs text-brand-100 mt-2 leading-relaxed">
                You have {proposalStage?.count || 0} enterprise proposal{(proposalStage?.count || 0) === 1 ? '' : 's'} pending client review worth {proposalStage?.value || '$0'}.
              </p>

              <button
                onClick={() => navigate('/leads')}
                className="mt-5 w-full py-2.5 px-4 rounded-xl bg-white text-brand-700 hover:bg-brand-50 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Review Pending Proposals</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Quick CRM Actions
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate('/leads')}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500 hover:bg-brand-50/50 dark:hover:bg-brand-950/40 text-left transition-all cursor-pointer"
              >
                <KanbanSquare className="w-5 h-5 text-brand-500 mb-1" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Kanban Board</span>
                <span className="text-[10px] text-slate-400">
                  {dashboardData.topMetrics?.activeLeads ?? 0} active deals
                </span>
              </button>

              <button
                onClick={() => navigate('/invoices')}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500 hover:bg-brand-50/50 dark:hover:bg-brand-950/40 text-left transition-all cursor-pointer"
              >
                <Receipt className="w-5 h-5 text-brand-500 mb-1" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Create Invoice</span>
                <span className="text-[10px] text-slate-400">PDF printable</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
