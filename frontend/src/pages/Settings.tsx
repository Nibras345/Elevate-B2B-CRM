import React, { useState, useEffect, FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  User,
  Building,
  Users,
  Shield,
  Key,
  Bell,
  Camera,
  Plus,
  Trash2,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Mail,
  UserX,
} from 'lucide-react';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { TeamMember, Role } from '../types';
import { ProfileSettings } from '../components/profile/ProfileSettings';

export const Settings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTabFromUrl = searchParams.get('tab') || 'profile';

  const [activeTab, setActiveTab] = useState(currentTabFromUrl);

  const { user, tenantSettings, updateProfile, updateTenant } = useAuth();
  const { notify } = useNotification();

  // Keep tab in sync with URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Company Settings Form State
  const [companyForm, setCompanyForm] = useState({
    companyName: tenantSettings?.companyName || user.companyName,
    tenantId: tenantSettings?.tenantId || user.tenantId,
    currency: tenantSettings?.currency || 'USD ($)',
    fiscalYear: tenantSettings?.fiscalYear || 'Jan - Dec',
    defaultTaxRate: tenantSettings?.defaultTaxRate || 10,
    invoiceTerms: tenantSettings?.invoiceTerms || 'Net 30 Days',
    address: tenantSettings?.address || '100 Montgomery St, Suite 1800, San Francisco, CA',
    website: tenantSettings?.website || 'https://apexhorizon.com',
  });

  // Team Members Dynamic State
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [isTeamLoading, setIsTeamLoading] = useState<boolean>(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);

  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'Sales Agent' as Role,
    department: 'Enterprise Sales',
  });

  // Security toggles
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState<Record<string, boolean>>({
    dealWon: true,
    invoicePaid: true,
    newLeadAssigned: true,
    weeklyReport: false,
  });

  const isAdmin = user.role === 'Company Admin' || (user.role as string) === 'Super Admin';

  // Fetch Team Members from Route 2: GET /api/team
  const fetchTeamMembers = async () => {
    setIsTeamLoading(true);
    setTeamError(null);
    try {
      const activeToken = localStorage.getItem('nexcrm_jwt_token');
      const response = await axios.get('/api/team', {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if (response.data.success && Array.isArray(response.data.team)) {
        setTeam(response.data.team);
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to retrieve team members.';
      setTeamError(errMsg);
      console.error('[Fetch Team Error]:', err);
    } finally {
      setIsTeamLoading(false);
    }
  };

  // Synchronize team data on initial mount and when Team tab is active
  useEffect(() => {
    fetchTeamMembers();
  }, [activeTab]);

  // Save Company Settings (Admin only)
  const handleSaveCompany = (e: FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      notify('Access Denied: Only Company Admins can edit tenant configurations', 'error');
      return;
    }
    updateTenant(companyForm);
    notify(`Company tenant settings saved for ${companyForm.companyName}`, 'success');
  };

  // Route 1: POST /api/team/invite
  const handleInviteUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!inviteForm.email.trim()) {
      notify('Please enter a valid email address.', 'error');
      return;
    }

    setIsInviting(true);
    try {
      const activeToken = localStorage.getItem('nexcrm_jwt_token');
      const response = await axios.post(
        '/api/team/invite',
        {
          email: inviteForm.email.trim(),
          role: inviteForm.role,
          department: inviteForm.department.trim() || 'General',
        },
        {
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success) {
        notify(
          response.data.message || `Invitation successfully sent to ${inviteForm.email}`,
          'success'
        );
        setIsInviteModalOpen(false);
        setInviteForm({
          email: '',
          role: 'Sales Agent',
          department: 'Enterprise Sales',
        });
        // Refresh team table
        await fetchTeamMembers();
      } else {
        notify(response.data.message || 'Failed to send invitation.', 'error');
      }
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message || 'Server error while sending invitation email.';
      notify(errMsg, 'error');
    } finally {
      setIsInviting(false);
    }
  };

  // Route 4: DELETE /api/team/remove/:id
  const handleRemoveMember = async (id: string) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to remove this member from your workspace?"
    );
    if (!isConfirmed) return;

    setDeletingMemberId(id);
    try {
      const activeToken = localStorage.getItem('nexcrm_jwt_token');
      const response = await axios.delete(`/api/team/remove/${id}`, {
        headers: {
          Authorization: `Bearer ${activeToken}`,
        },
      });

      if (response.data.success) {
        notify(response.data.message || 'Member removed successfully', 'success');
        // Dynamically update state to remove row from table without reloading
        setTeam((prev) => prev.filter((m) => m.id !== id && (m as any)._id !== id));
      } else {
        notify(response.data.message || 'Failed to remove member.', 'error');
      }
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message || 'Server error while removing member.';
      notify(errMsg, 'error');
    } finally {
      setDeletingMemberId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Settings & Tenant Governance
          </h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            Tenant: {user.tenantId}
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Configure profile details, multi-tenant branding, role permissions, and user seats
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {[
          { id: 'profile', label: 'My Profile', icon: User },
          { id: 'company', label: 'Company Settings', icon: Building, badge: !isAdmin ? 'Admin Only' : null },
          { id: 'team', label: 'Team Members', icon: Users, count: team.length },
          { id: 'security', label: 'Security & Alerts', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400 dark:border-brand-400'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded text-[10px] font-bold">
                  {tab.badge}
                </span>
              )}
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px]">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: Profile (Personal Information & Cloudinary Profile Picture) */}
      {activeTab === 'profile' && <ProfileSettings />}

      {/* TAB 2: Company Settings (Admin Only) */}
      {activeTab === 'company' && (
        <div className="space-y-6">
          {!isAdmin && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-bold text-xs uppercase tracking-wider block">
                  Admin Privileges Required
                </span>
                <p className="text-xs mt-0.5">
                  You are currently simulating the <strong>Employee</strong> role. Company branding and invoice
                  preferences can only be modified by a <strong>Company Admin</strong>. You can switch roles using
                  the user menu in the top right navbar.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Multi-Tenant Company Profile & Invoicing Preferences
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Settings established here reflect on all generated invoices, email notifications, and deal exports.
                </p>
              </div>

              <span className="text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300">
                {companyForm.tenantId}
              </span>
            </div>

            <form onSubmit={handleSaveCompany} className="mt-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Company Legal Name
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={companyForm.companyName}
                    onChange={(e) => setCompanyForm({ ...companyForm, companyName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Tenant System Identifier (Immutable)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={companyForm.tenantId}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Default Currency
                  </label>
                  <select
                    disabled={!isAdmin}
                    value={companyForm.currency}
                    onChange={(e) => setCompanyForm({ ...companyForm, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white disabled:opacity-60"
                  >
                    <option>USD ($)</option>
                    <option>EUR (€)</option>
                    <option>GBP (£)</option>
                    <option>AUD (A$)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Default Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    disabled={!isAdmin}
                    value={companyForm.defaultTaxRate}
                    onChange={(e) => setCompanyForm({ ...companyForm, defaultTaxRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Default Payment Terms
                  </label>
                  <select
                    disabled={!isAdmin}
                    value={companyForm.invoiceTerms}
                    onChange={(e) => setCompanyForm({ ...companyForm, invoiceTerms: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white disabled:opacity-60"
                  >
                    <option>Net 15 Days</option>
                    <option>Net 30 Days</option>
                    <option>Net 60 Days</option>
                    <option>Due on Receipt</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Company Headquarters Address
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={companyForm.address}
                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Official Website
                  </label>
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="submit"
                  disabled={!isAdmin}
                  className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-500/20 disabled:opacity-50 cursor-pointer"
                >
                  Save Company Preferences
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: Team Members */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Team Members & Seat Management
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage roles, seat allocation, and invite colleagues to this tenant workspace
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchTeamMembers}
                disabled={isTeamLoading}
                className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Refresh Team List"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isTeamLoading ? 'animate-spin text-brand-600' : ''}`}
                />
              </button>

              <button
                type="button"
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-500/20 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>+ Invite User</span>
              </button>
            </div>
          </div>

          {/* Team error notification banner if fetch failed */}
          {teamError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{teamError}</span>
              </div>
              <button
                onClick={fetchTeamMembers}
                className="font-semibold underline hover:text-rose-900 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-6">Member</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Closed Revenue</th>
                    <th className="py-3 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {/* Loading State */}
                  {isTeamLoading && team.length === 0 && (
                    <>
                      {[1, 2, 3].map((skeletonIdx) => (
                        <tr key={skeletonIdx} className="animate-pulse">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800" />
                              <div className="space-y-1.5">
                                <div className="w-28 h-3.5 bg-slate-200 dark:bg-slate-800 rounded" />
                                <div className="w-36 h-2.5 bg-slate-100 dark:bg-slate-800/60 rounded" />
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="w-20 h-5 bg-slate-200 dark:bg-slate-800 rounded-full" />
                          </td>
                          <td className="py-4 px-4">
                            <div className="w-24 h-3.5 bg-slate-200 dark:bg-slate-800 rounded" />
                          </td>
                          <td className="py-4 px-4">
                            <div className="w-16 h-4 bg-slate-200 dark:bg-slate-800 rounded-full" />
                          </td>
                          <td className="py-4 px-4">
                            <div className="w-12 h-3.5 bg-slate-200 dark:bg-slate-800 rounded" />
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="w-6 h-6 bg-slate-200 dark:bg-slate-800 rounded ml-auto" />
                          </td>
                        </tr>
                      ))}
                    </>
                  )}

                  {/* Empty State */}
                  {!isTeamLoading && team.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 px-6 text-center">
                        <div className="max-w-xs mx-auto space-y-3">
                          <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/40 text-brand-600 flex items-center justify-center mx-auto">
                            <Users className="w-6 h-6" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              No Colleagues Found
                            </h4>
                            <p className="text-xs text-slate-400 mt-1">
                              Invite team members to collaborate on deals, pipelines, and invoices.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsInviteModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 shadow-sm cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Invite First Member</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Dynamic Rows */}
                  {team.map((member) => {
                    const memberId = member.id || (member as any)._id;
                    const isCurrentUser =
                      member.email.toLowerCase() === user.email.toLowerCase() ||
                      memberId === user.id;

                    return (
                      <tr
                        key={memberId}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-6">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                member.avatar ||
                                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
                              }
                              alt={member.name}
                              className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                            />
                            <div>
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {member.name || member.email.split('@')[0]}
                              </span>
                              <span className="text-[11px] text-slate-400 block">
                                {member.email}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <Badge
                            variant={
                              member.role === 'Company Admin'
                                ? 'primary'
                                : member.role === 'Support'
                                ? 'purple'
                                : 'neutral'
                            }
                            size="sm"
                          >
                            {member.role}
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          {member.department || 'General'}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              member.status === 'Active'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                member.status === 'Active' ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                            />
                            {member.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-slate-200">
                          {member.closedRevenue || member.closedValue || '$0'}
                        </td>

                        <td className="py-3.5 px-6 text-right">
                          {isCurrentUser ? (
                            <span className="text-[10px] text-slate-400 italic">You (Current)</span>
                          ) : isAdmin ? (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(memberId)}
                              disabled={deletingMemberId === memberId}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer disabled:opacity-50"
                              title={
                                member.status === 'Invited'
                                  ? 'Cancel Pending Invitation'
                                  : 'Remove Colleague'
                              }
                            >
                              {deletingMemberId === memberId ? (
                                <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Protected</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invite User Modal */}
          <Modal
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
            title="Invite New Colleague"
            subtitle="Send an email invitation link with tenant pipeline access"
            maxWidth="max-w-md"
          >
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="colleague@yourcompany.com"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Role Assignment <span className="text-rose-500">*</span>
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, role: e.target.value as Role })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 cursor-pointer"
                >
                  <option value="Sales Agent">Sales Agent (Pipeline & Deals)</option>
                  <option value="Company Admin">Company Admin (Full Tenant Control)</option>
                  <option value="Support">Support (Read-only Clients & Invoices)</option>
                  <option value="Employee">Employee (Standard Access)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  placeholder="e.g. Enterprise Sales, Support, Engineering"
                  value={inviteForm.department}
                  onChange={(e) =>
                    setInviteForm({ ...inviteForm, department: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  disabled={isInviting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-500/20 cursor-pointer disabled:opacity-60 transition-all"
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Invite...</span>
                    </>
                  ) : (
                    <span>Send Invite</span>
                  )}
                </button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {/* TAB 4: Security & Alerts */}
      {activeTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Security Protocols */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>Authentication & 2FA Protocols</span>
            </h3>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40">
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Two-Factor Authentication (TOTP)
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Require authenticator code on unrecognized sign-ins
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTwoFactorEnabled(!twoFactorEnabled);
                  notify(`2FA ${!twoFactorEnabled ? 'Enabled' : 'Disabled'}`, 'info');
                }}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                  twoFactorEnabled ? 'bg-brand-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    twoFactorEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <span className="font-bold text-slate-800 dark:text-slate-200 block">
                Active Session Information
              </span>
              <div className="flex justify-between text-slate-500">
                <span>Current Device:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Chrome on Windows</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>IP Address:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">198.51.100.42 (US West)</span>
              </div>
            </div>
          </div>

          {/* Email Notification Alerts */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-500" />
              <span>Email & In-App Alerts</span>
            </h3>

            {[
              { key: 'dealWon', title: 'Deal Won Notifications', desc: 'Alert when any rep moves a deal to Won status' },
              { key: 'invoicePaid', title: 'Invoice Settlement Notices', desc: 'Real-time alert when clients remit wire or card funds' },
              { key: 'newLeadAssigned', title: 'Lead Assignment Alerts', desc: 'Direct alert when you are tagged as deal owner' },
              { key: 'weeklyReport', title: 'Weekly Executive Digest', desc: 'Consolidated Monday 8am pipeline digest email' },
            ].map((pref) => (
              <div
                key={pref.key}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800"
              >
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    {pref.title}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">{pref.desc}</span>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts[pref.key]}
                  onChange={(e) => {
                    setEmailAlerts({ ...emailAlerts, [pref.key]: e.target.checked });
                    notify(`Updated preference for ${pref.title}`, 'info');
                  }}
                  className="rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
