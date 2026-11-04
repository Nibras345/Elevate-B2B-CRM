
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  Building2,
  Users,
  DollarSign,
  Shield,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  PauseCircle,
  PlayCircle,
  Copy,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Activity,
  Layers,
  ArrowLeft,
  X,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { DashboardStatsResponse, SuperAdminTenant } from '../types';

export const SuperAdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { notify } = useNotification();

  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [tenants, setTenants] = useState<SuperAdminTenant[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Active' | 'Suspended'>('ALL');

  // Confirmation Modal State
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<SuperAdminTenant | null>(null);
  const [actionType, setActionType] = useState<string>(''); // 'suspend' or 'delete'
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);

  // Format currency in USD (e.g., $619,213)
  const formatUSD = (val: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  // Fetch Super Admin Aggregated Metrics & Tenants
  const fetchSuperAdminData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true);
      else setIsLoading(true);

      const token = localStorage.getItem('nexcrm_jwt_token');
      const authHeader = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      const [statsRes, tenantsRes] = await Promise.all([
        axios.get<DashboardStatsResponse>('/api/super-admin/dashboard-stats', authHeader),
        axios.get('/api/super-admin/tenants', authHeader),
      ]);

      if (statsRes.data?.success || statsRes.data?.totalRegisteredCompanies !== undefined) {
        const statsData = (statsRes.data as any).stats || statsRes.data;
        setStats({
          totalRegisteredCompanies: Number(statsData.totalRegisteredCompanies ?? statsData.totalCompanies) || 0,
          totalActiveCompanies: Number(statsData.totalActiveCompanies ?? statsData.totalCompanies) || 0,
          globalPlatformRevenue: Number(statsData.globalPlatformRevenue ?? statsData.totalPlatformRevenue) || 0,
        });
      }

      if (tenantsRes.data?.success) {
        const tenantList = tenantsRes.data.tenants || tenantsRes.data.data || [];
        setTenants(tenantList);
      }
    } catch (error: any) {
      console.error('Failed to load Super Admin data:', error);
      const msg = error.response?.data?.message || 'Failed to load platform data. Access restricted to Super Admin.';
      notify(msg, 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchSuperAdminData();
  }, [fetchSuperAdminData]);

  // Action Handlers for Modal Workflow
  const handleOpenActionModal = (company: SuperAdminTenant, type: string) => {
    setSelectedCompany(company);
    setActionType(type);
    setIsActionModalOpen(true);
  };

  const handleCloseActionModal = () => {
    if (isSubmittingAction) return;
    setIsActionModalOpen(false);
    setSelectedCompany(null);
    setActionType('');
  };

  const handleConfirmAction = async () => {
    if (!selectedCompany || !actionType) return;

    try {
      setIsSubmittingAction(true);
      const token = localStorage.getItem('nexcrm_jwt_token');
      const companyId = selectedCompany.id || selectedCompany._id;

      if (actionType === 'delete') {
        const response = await axios.delete(`/api/super-admin/tenants/${companyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data?.success) {
          setTenants((prev) => prev.filter((t) => (t.id || t._id) !== companyId));
          notify(
            `Workspace "${selectedCompany.name || selectedCompany.companyName}" successfully deleted.`,
            'success'
          );
          // Refresh aggregate KPI stats
          fetchSuperAdminData(true);
        }
      } else if (actionType === 'suspend') {
        const nextStatus = selectedCompany.status === 'Suspended' ? 'Active' : 'Suspended';
        const response = await axios.patch(
          `/api/super-admin/tenants/${companyId}/status`,
          { status: nextStatus },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data?.success) {
          setTenants((prev) =>
            prev.map((t) =>
              (t.id || t._id) === companyId ? { ...t, status: nextStatus } : t
            )
          );
          notify(
            `Workspace "${selectedCompany.name || selectedCompany.companyName}" is now ${nextStatus}.`,
            nextStatus === 'Active' ? 'success' : 'warning'
          );
          // Refresh active companies count immediately
          fetchSuperAdminData(true);
        }
      }

      handleCloseActionModal();
    } catch (error: any) {
      console.error(`Failed to execute ${actionType} action:`, error);
      notify(
        error.response?.data?.message || `Failed to execute ${actionType} action on company.`,
        'error'
      );
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    notify(`Copied ${text} to clipboard!`, 'info', 2000);
  };

  // Filtered Tenants List
  const filteredTenants = tenants.filter((tenant) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      (tenant.companyName && tenant.companyName.toLowerCase().includes(query)) ||
      (tenant.tenantId && tenant.tenantId.toLowerCase().includes(query)) ||
      (tenant.adminEmail && tenant.adminEmail.toLowerCase().includes(query));

    const matchesStatus =
      statusFilter === 'ALL' || tenant.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Distinct Super Admin Console Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-950 via-slate-900 to-indigo-950 border-b border-violet-800/40 px-6 py-6 sm:px-8">
        {/* Ambient Glow */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/40 shadow-sm shadow-violet-500/10">
                <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                SUPER ADMIN CENTRAL COMMAND
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Multi-Tenant Telemetry
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              Platform Master Console
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Global overview and management across all registered SaaS tenant organizations.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition shadow-sm hover:border-violet-500/50"
            >
              <ArrowLeft className="w-4 h-4 text-violet-400" />
              <span>Back to CRM</span>
            </Link>
            <button
              onClick={() => fetchSuperAdminData(true)}
              disabled={isRefreshing || isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition shadow-sm hover:border-violet-500/50 disabled:opacity-50"
              title="Refresh live metrics"
            >
              <RefreshCw className={`w-4 h-4 text-violet-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh Telemetry'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <main className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* ======================================================== */}
        {/* 1. TOP KPI HEADER CARDS (3 CARDS REQUIRED)               */}
        {/* ======================================================== */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Total Registered Companies */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-violet-800/40 p-6 shadow-xl shadow-slate-950/50 hover:border-violet-600/60 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-400/90">
                  TOTAL REGISTERED COMPANIES
                </p>
                <h3 className="text-3xl font-black text-white mt-2 tracking-tight">
                  {isLoading ? (
                    <span className="inline-block w-16 h-8 bg-slate-800 rounded animate-pulse" />
                  ) : (
                    stats?.totalRegisteredCompanies ?? 0
                  )}
                </h3>
              </div>
              <div className="w-13 h-13 rounded-2xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-inner">
                <Building2 className="w-7 h-7" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-violet-300">
                <Layers className="w-3.5 h-3.5" />
                Registered SaaS Workspaces
              </span>
              <span className="font-mono text-slate-500">Live Database Count</span>
            </div>
          </div>

          {/* Card 2: Total Active Companies */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-indigo-800/40 p-6 shadow-xl shadow-slate-950/50 hover:border-indigo-600/60 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400/90">
                  TOTAL ACTIVE COMPANIES
                </p>
                <h3 className="text-3xl font-black text-white mt-2 tracking-tight">
                  {isLoading ? (
                    <span className="inline-block w-16 h-8 bg-slate-800 rounded animate-pulse" />
                  ) : (
                    stats?.totalActiveCompanies ?? 0
                  )}
                </h3>
              </div>
              <div className="w-13 h-13 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                <CheckCircle2 className="w-7 h-7" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-indigo-300">
                <Activity className="w-3.5 h-3.5" />
                Operational & Healthy Status
              </span>
              <span className="font-mono text-slate-500">Excludes Suspended</span>
            </div>
          </div>

          {/* Card 3: Global Platform Revenue */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-900/90 border border-emerald-800/40 p-6 shadow-xl shadow-slate-950/50 hover:border-emerald-600/60 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90">
                  GLOBAL PLATFORM REVENUE
                </p>
                <h3 className="text-3xl font-black text-emerald-400 mt-2 tracking-tight">
                  {isLoading ? (
                    <span className="inline-block w-24 h-8 bg-slate-800 rounded animate-pulse" />
                  ) : (
                    formatUSD(stats?.globalPlatformRevenue ?? 0)
                  )}
                </h3>
              </div>
              <div className="w-13 h-13 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <DollarSign className="w-7 h-7" />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                Sum of Won Deals & Paid Invoices
              </span>
              <span className="font-mono text-slate-500">Live Aggregate</span>
            </div>
          </div>
        </section>

        {/* ======================================================== */}
        {/* 2. REGISTERED COMPANIES DATA TABLE                       */}
        {/* ======================================================== */}
        <section className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Table Header Controls */}
          <div className="p-5 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-violet-400" />
                Registered Companies
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Comprehensive directory of customer workspaces, seat utilization, and financial performance.
              </p>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search Box */}
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search company, ID, or admin..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-xs">
                {(['ALL', 'Active', 'Suspended'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition ${
                      statusFilter === filter
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {filter === 'ALL' ? 'All' : filter}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table Element */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/70 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th scope="col" className="py-3.5 px-6">Company ID</th>
                  <th scope="col" className="py-3.5 px-6">Admin Email</th>
                  <th scope="col" className="py-3.5 px-6">Seats Used</th>
                  <th scope="col" className="py-3.5 px-6">Total Company Revenue</th>
                  <th scope="col" className="py-3.5 px-6">Status</th>
                  <th scope="col" className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="w-6 h-6 animate-spin text-violet-500" />
                        <span className="text-sm">Fetching platform tenant directories...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Building2 className="w-10 h-10 text-slate-600 stroke-[1.5]" />
                        <p className="text-base font-semibold text-slate-300">No organizations matched your search</p>
                        <p className="text-xs text-slate-500">Try adjusting your keyword filter or status toggles.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant) => {
                    const percentUsed = Math.min(
                      100,
                      Math.round(((tenant.seatsUsed || 0) / (tenant.maxSeats || 25)) * 100)
                    );

                    return (
                      <tr
                        key={tenant.id}
                        className="hover:bg-slate-800/40 transition group"
                      >
                        {/* 1. Company ID & Name */}
                        <td className="py-4 px-6">
                          <div className="flex flex-col">
                            <span className="font-semibold text-white group-hover:text-violet-300 transition flex items-center gap-1.5">
                              {tenant.companyName || tenant.name || 'Unnamed Company'}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-xs text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                                {tenant.tenantId}
                              </span>
                              <button
                                onClick={() => copyToClipboard(tenant.tenantId)}
                                className="text-slate-500 hover:text-slate-300 transition"
                                title="Copy Tenant ID"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* 2. Admin Email */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-xs font-semibold">
                              {tenant.adminEmail?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span className="font-mono text-xs text-slate-300 truncate max-w-[200px]" title={tenant.adminEmail}>
                              {tenant.adminEmail}
                            </span>
                          </div>
                        </td>

                        {/* 3. Seats Used (e.g. 5/25) */}
                        <td className="py-4 px-6">
                          <div className="space-y-1.5 w-32">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-slate-200">{tenant.seatsDisplay || `${tenant.seatsUsed}/${tenant.maxSeats}`}</span>
                              <span className="text-[11px] text-slate-400 font-mono">{percentUsed}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  percentUsed >= 90
                                    ? 'bg-rose-500'
                                    : percentUsed >= 75
                                    ? 'bg-amber-500'
                                    : 'bg-violet-500'
                                }`}
                                style={{ width: `${percentUsed}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* 4. Total Company Revenue */}
                        <td className="py-4 px-6">
                          <span className="font-semibold text-emerald-400 font-mono text-sm">
                            {formatUSD(tenant.totalRevenue || 0)}
                          </span>
                        </td>

                        {/* 5. Status (Active / Suspended) */}
                        <td className="py-4 px-6">
                          {tenant.status === 'Active' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/25">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              Suspended
                            </span>
                          )}
                        </td>

                        {/* 6. Actions (Suspend / Delete) */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Suspend / Activate Button */}
                            <button
                              onClick={() => {
                                setSelectedCompany(tenant);
                                setActionType('suspend');
                                setIsActionModalOpen(true);
                              }}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                                tenant.status === 'Suspended'
                                  ? 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border-emerald-700/50'
                                  : 'bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border-amber-700/40'
                              }`}
                              title={tenant.status === 'Suspended' ? 'Re-activate workspace' : 'Suspend workspace'}
                            >
                              {tenant.status === 'Suspended' ? (
                                <>
                                  <PlayCircle className="w-3.5 h-3.5" />
                                  <span>Activate</span>
                                </>
                              ) : (
                                <>
                                  <PauseCircle className="w-3.5 h-3.5" />
                                  <span>Suspend</span>
                                </>
                              )}
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => {
                                setSelectedCompany(tenant);
                                setActionType('delete');
                                setIsActionModalOpen(true);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-700/40 transition hover:border-rose-500"
                              title="Delete workspace"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="sr-only sm:not-sr-only">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {filteredTenants.length} of {tenants.length} registered organizations
            </span>
            <span className="font-mono">
              NexSphere Multi-Tenant Engine v2.4
            </span>
          </div>
        </section>
      </main>

      {/* ======================================================== */}
      {/* 3. CONFIRMATION MODAL (SUSPEND / DELETE)                 */}
      {/* ======================================================== */}
      {isActionModalOpen && selectedCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          {/* Modal Backdrop click to close */}
          <div
            className="fixed inset-0"
            onClick={handleCloseActionModal}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 z-10">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-2xl flex-shrink-0 ${
                  actionType === 'delete'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {actionType === 'delete' ? (
                  <Trash2 className="w-6 h-6" />
                ) : (
                  <AlertTriangle className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Confirm {actionType === 'delete' ? 'Deletion' : 'Suspension'}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Tenant ID: <span className="font-mono text-slate-300">{selectedCompany.tenantId}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseActionModal}
                disabled={isSubmittingAction}
                className="text-slate-400 hover:text-slate-200 transition p-1 rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Text */}
            <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 text-sm text-slate-300 leading-relaxed">
              Are you sure you want to {actionType} the workspace for &quot;
              <span className="font-semibold text-white">
                {selectedCompany?.name || selectedCompany?.companyName}
              </span>
              &quot;? This action is irreversible.
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCloseActionModal}
                disabled={isSubmittingAction}
                className="px-4 py-2.5 text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isSubmittingAction}
                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition shadow-lg disabled:opacity-50 ${
                  actionType === 'delete'
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30'
                    : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30'
                }`}
              >
                {isSubmittingAction && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default SuperAdminDashboard;
