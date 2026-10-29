import React, { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  Building,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Role } from '../../types';

export const Register: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [role, setRole] = useState<Role>('Company Admin');
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();

  // Calculated preview of Tenant ID for Company Admin
  const tenantPreview = companyName.trim()
    ? `TNT-${companyName.trim().substring(0, 4).toUpperCase()}-9402`
    : 'TNT-CORP-9402';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    // Strict validation: companyName is required ONLY for Company Admin
    if (role === 'Company Admin' && !companyName.trim()) {
      notify('Please enter your Company Name to provision your Tenant ID', 'warning');
      return;
    }

    setIsLoading(true);

    try {
      // Build Axios POST payload: role is explicitly included;
      // If role === 'Employee', companyName is sent as null
      const payload: {
        name: string;
        email: string;
        password: string;
        role: Role;
        companyName?: string | null;
      } = {
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        ...(role === 'Company Admin' ? { companyName: companyName.trim() } : { companyName: null }),
      };

      const res = await register(payload);

      if (res.success) {
        notify(
          res.message ||
            (role === 'Company Admin'
              ? `Tenant workspace provisioned for ${companyName}! Welcome aboard.`
              : 'Account created successfully! Welcome to the CRM.'),
          'success'
        );
        navigate('/dashboard');
      } else {
        notify(res.message || 'Registration failed. Please check your details.', 'error');
      }
    } catch (err: any) {
      notify(err.response?.data?.message || err.message || 'Registration failed.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex">
      {/* Left Column: SaaS Onboarding Value Prop */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 text-white p-12 flex-col justify-between overflow-hidden">
        {/* Glow circles */}
        <div className="absolute top-10 -left-10 w-80 h-80 bg-brand-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 -right-10 w-96 h-96 bg-indigo-600/25 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">NexSphere</span>
              <span className="text-xs uppercase font-semibold text-brand-400 block tracking-wider">
                Multi-Tenant Enterprise CRM
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-lg space-y-6 my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{role === 'Company Admin' ? 'Zero-Setup Tenant Provisioning' : 'Role-Based Workspace Access'}</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight leading-snug">
            {role === 'Company Admin'
              ? 'Your Dedicated CRM Tenant in under 60 seconds.'
              : 'Collaborate with your sales team in real time.'}
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed">
            {role === 'Company Admin'
              ? 'Every organization on NexSphere receives an isolated virtual data partition, custom branding options, configurable deal pipeline stages, and end-to-end PDF billing automation.'
              : 'Join your organization’s CRM workspace to manage leads, track deals through pipeline stages, create invoices, and collaborate with your team.'}
          </p>

          {/* Conditional Left Sidebar preview */}
          {role === 'Company Admin' ? (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-2">
              <span className="text-xs text-brand-300 font-semibold uppercase tracking-wider block">
                Live Tenant ID Generator
              </span>
              <div className="flex items-center justify-between">
                <span className="text-lg font-mono font-bold text-white">{tenantPreview}</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 font-medium px-2 py-0.5 rounded-md">
                  Isolated Partition
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-2">
              <span className="text-xs text-brand-300 font-semibold uppercase tracking-wider block">
                Employee Seat Assignment
              </span>
              <p className="text-xs text-slate-300 leading-relaxed">
                As an Employee, you do not need to create a new company. Your workspace access is linked to your email address or an invite from your Company Admin.
              </p>
            </div>
          )}
        </div>

        <div className="relative z-10 pt-8 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Enterprise encryption at rest & in transit</span>
          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>GDPR & CCPA Compliant</span>
          </div>
        </div>
      </div>

      {/* Right Column: Register Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md space-y-5 my-auto">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {role === 'Company Admin' ? 'Create SaaS Tenant Account' : 'Create Employee Account'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {role === 'Company Admin'
                ? 'Start your 30-day enterprise trial with zero commitment'
                : 'Join your organization’s existing workspace'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Your Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jordan Matthews"
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            {/* Work Email */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jordan@company.com"
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div
                  onClick={() => setRole('Company Admin')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    role === 'Company Admin'
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 text-brand-900 dark:text-brand-200 ring-1 ring-brand-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">Company Admin</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Provisions new company & tenant partition
                  </div>
                </div>

                <div
                  onClick={() => setRole('Employee')}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    role === 'Employee'
                      ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 text-brand-900 dark:text-brand-200 ring-1 ring-brand-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold">Employee</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Pipeline, leads & client workspace access
                  </div>
                </div>
              </div>
            </div>

            {/* Company Name (Tenant ID Foundation) - STRICTLY CONDITIONAL: Shown only for Company Admin */}
            {role === 'Company Admin' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Company Name <span className="text-brand-600 font-semibold">(Establishes Tenant ID)</span>
                  </label>
                </div>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Apex Horizon Technologies"
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 transition-all"
                  />
                </div>
                {companyName && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Assigned Tenant: {tenantPreview}
                  </p>
                )}
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            {/* Terms checkbox */}
            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                required
                id="terms"
                defaultChecked
                className="mt-0.5 rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500"
              />
              <label htmlFor="terms" className="text-xs text-slate-500 dark:text-slate-400 leading-snug">
                I agree to the SaaS Master Subscription Agreement and Data Processing Addendum.
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer mt-2"
            >
              {isLoading ? (
                <span>{role === 'Company Admin' ? 'Provisioning Tenant...' : 'Creating Account...'}</span>
              ) : (
                <>
                  <span>{role === 'Company Admin' ? 'Create Workspace & Start CRM' : 'Create Account & Join CRM'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Already have an enterprise tenant?{' '}
              <Link to="/login" className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
