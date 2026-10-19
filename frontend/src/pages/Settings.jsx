import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  User,
  Building,
  Users,
  Shield,
  Key,
  Bell,
  Mail,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Sparkles,
  Lock,
  Globe,
  DollarSign,
  ShieldAlert,
} from 'lucide-react';
import { initialTeamMembers } from '../data/mockData';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export const Settings = () => {
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

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: user.name,
    email: user.email,
    phone: '+1 (555) 234-5678',
    department: user.department || 'Executive Sales',
    avatar: user.avatar,
    timezone: 'UTC-08:00 (Pacific Time)',
  });

  // Password State
  const [passForm, setPassForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

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

  // Team Members State
  const [team, setTeam] = useState(initialTeamMembers);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'Sales Agent',
    department: 'Enterprise Sales',
  });

  // Security toggles
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState({
    dealWon: true,
    invoicePaid: true,
    newLeadAssigned: true,
    weeklyReport: false,
  });

  const isAdmin = user.role === 'Company Admin';

  // Save Profile
  const handleSaveProfile = (e) => {
    e.preventDefault();
    updateProfile({
      name: profileForm.name,
      email: profileForm.email,
      avatar: profileForm.avatar,
      department: profileForm.department,
    });
    notify('Profile updated successfully', 'success');
  };

  // Change Password
  const handleChangePassword = (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      notify('New passwords do not match', 'error');
      return;
    }
    setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    notify('Security password updated', 'success');
  };

  // Save Company Settings (Admin only)
  const handleSaveCompany = (e) => {
    e.preventDefault();
    if (!isAdmin) {
      notify('Access Denied: Only Company Admins can edit tenant configurations', 'error');
      return;
    }
    updateTenant(companyForm);
    notify(`Company tenant settings saved for ${companyForm.companyName}`, 'success');
  };

  // Invite Team Member
  const handleInviteUser = (e) => {
    e.preventDefault();
    const newMember = {
      id: `team-${Date.now()}`,
      name: inviteForm.name,
      email: inviteForm.email,
      role: inviteForm.role,
      department: inviteForm.department,
      status: 'Invited',
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80`,
      phone: '+1 (555) 000-0000',
      leadsCount: 0,
      closedValue: '$0',
    };
    setTeam([...team, newMember]);
    setIsInviteModalOpen(false);
    setInviteForm({ name: '', email: '', role: 'Sales Agent', department: 'Enterprise Sales' });
    notify(`Invitation sent to ${newMember.email} as ${newMember.role}`, 'success');
  };

  // Remove team member
  const handleRemoveMember = (id, name) => {
    setTeam(prev => prev.filter(m => m.id !== id));
    notify(`Removed ${name} from tenant workspace`, 'info');
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

      {/* TAB 1: Profile */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Avatar Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col items-center text-center">
            <div className="relative group">
              <img
                src={profileForm.avatar}
                alt={user.name}
                className="w-24 h-24 rounded-2xl object-cover ring-4 ring-brand-500/20 shadow-md"
              />
              <button
                type="button"
                onClick={() => {
                  const newUrl = prompt('Enter image URL for your profile avatar:');
                  if (newUrl) {
                    setProfileForm({ ...profileForm, avatar: newUrl });
                    notify('Avatar image updated', 'info');
                  }
                }}
                className="absolute -bottom-2 -right-2 p-2 bg-brand-600 text-white rounded-xl shadow-md hover:bg-brand-500 transition-colors"
                title="Change Avatar"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
              {profileForm.name}
            </h3>
            <p className="text-xs text-slate-400">{profileForm.email}</p>

            <div className="mt-3 flex items-center gap-1.5">
              <Badge variant="primary" size="sm">
                {user.role}
              </Badge>
              <Badge variant="neutral" size="sm">
                {user.tenantId}
              </Badge>
            </div>

            <div className="mt-6 w-full pt-4 border-t border-slate-100 dark:border-slate-800 text-left text-xs space-y-2 text-slate-500">
              <div className="flex justify-between">
                <span>Joined Workspace:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Jan 2024</span>
              </div>
              <div className="flex justify-between">
                <span>Department:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{profileForm.department}</span>
              </div>
            </div>
          </div>

          {/* Right: Personal Information & Password Form */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
                Personal Information
              </h3>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={profileForm.department}
                      onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-500/20"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>

            {/* Change Password Form */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Key className="w-4 h-4 text-brand-500" />
                <span>Security & Password</span>
              </h3>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={passForm.currentPassword}
                      onChange={(e) => setPassForm({ ...passForm, currentPassword: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Min 8 chars"
                      value={passForm.newPassword}
                      onChange={(e) => setPassForm({ ...passForm, newPassword: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Repeat new password"
                      value={passForm.confirmPassword}
                      onChange={(e) => setPassForm({ ...passForm, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-xs font-semibold"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
                  className="px-4 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-500/20 disabled:opacity-50"
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
                Manage roles, pipeline visibility, and invite team members to this tenant
              </p>
            </div>

            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Invite User</span>
            </button>
          </div>

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
                  {team.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-8 h-8 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                          />
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {member.name}
                            </span>
                            <span className="text-[11px] text-slate-400 block">{member.email}</span>
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
                        {member.department}
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
                        {member.closedValue}
                      </td>

                      <td className="py-3.5 px-6 text-right">
                        {member.id !== 'team-1' ? (
                          <button
                            onClick={() => handleRemoveMember(member.id, member.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Remove Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Primary Admin</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Invite User Modal */}
          <Modal
            isOpen={isInviteModalOpen}
            onClose={() => setIsInviteModalOpen(false)}
            title="Invite New Colleague"
            subtitle="Grant tenant pipeline access and allocate seat licenses"
            maxWidth="max-w-md"
          >
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel Vance"
                  value={inviteForm.name}
                  onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Work Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="samuel@apexhorizon.com"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Role Assignment
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                >
                  <option value="Sales Agent">Sales Agent (Pipeline & Deals)</option>
                  <option value="Company Admin">Company Admin (Full Tenant Control)</option>
                  <option value="Support">Support (Read-only Clients & Invoices)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={inviteForm.department}
                  onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-500/20"
                >
                  Send Invitation
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
