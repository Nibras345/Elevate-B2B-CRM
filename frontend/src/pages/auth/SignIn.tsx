import React, { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Building2,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

export const SignIn: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const res = await login(email, password);
    if (res.success) {
      notify(res.message || 'Welcome back! Signed in successfully.', 'success');
      navigate('/dashboard');
    } else {
      notify(res.message || 'Authentication failed. Please check your credentials.', 'error');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex">
      {/* Left Column: Visual SaaS Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 text-white p-12 flex-col justify-between overflow-hidden">
        {/* Decorative glowing gradient meshes */}
        <div className="absolute top-0 -left-20 w-96 h-96 bg-brand-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Branding */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/30">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">NexSphere</span>
              <span className="text-xs uppercase font-semibold text-brand-400 block tracking-wider">
                Enterprise Multi-Tenant CRM
              </span>
            </div>
          </div>
        </div>

        {/* Middle Feature Highlights */}
        <div className="relative z-10 max-w-lg space-y-8 my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen Enterprise Architecture</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Accelerate your B2B revenue pipeline with real-time multi-tenant intelligence.
          </h1>

          <div className="space-y-4 pt-2">
            {[
              'Tenant-isolated databases with customizable Kanban workflows',
              'Integrated dynamic invoicing with automated tax and PDF generation',
              'Granular Role-Based Access Control (RBAC) & Team Audit Trails',
            ].map((text, idx) => (
              <div key={idx} className="flex items-center gap-3 text-slate-300 text-sm">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Social Proof / Trust Badge */}
        <div className="relative z-10 pt-8 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Trusted by 4,500+ high-growth enterprise teams</span>
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>SOC2 Type II Certified</span>
          </div>
        </div>
      </div>

      {/* Right Column: Sign In Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Sign In to Your Workspace
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Access your tenant CRM dashboard and manage your deals
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 transition-all placeholder-slate-400"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-brand-600 dark:text-brand-400 hover:underline cursor-pointer"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 transition-all placeholder-slate-400"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-slate-300 dark:border-slate-700 text-brand-600 focus:ring-brand-500"
                />
                <span>Remember this device for 30 days</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
            >
              {isLoading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Link to Register */}
          <div className="text-center pt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              New company onboarding?{' '}
              <Link to="/register" className="font-semibold text-brand-600 dark:text-brand-400 hover:underline">
                Register New Tenant
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
