import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Clock,
  Mail,
  RefreshCw,
  LogOut,
  CheckCircle2,
  Shield,
  ArrowRight,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export const PendingInviteScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);

  const handleRefresh = () => {
    setIsChecking(true);
    // Reload window to trigger token re-verification and fetch updated tenantId
    setTimeout(() => {
      window.location.reload();
    }, 400);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex flex-col justify-between text-slate-800 dark:text-slate-200 transition-colors">
      {/* Top Header Bar */}
      <header className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/25">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-white tracking-tight text-base block leading-none">
              NexSphere
            </span>
            <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
              Multi-Tenant Enterprise CRM
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Sign Out Button */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer border border-rose-200/60 dark:border-rose-900/50"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Center Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-200">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-amber-700 dark:text-amber-300 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Workspace Assignment Pending</span>
          </div>

          {/* Center Graphic */}
          <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
            <div className="absolute inset-0 rounded-2xl bg-amber-500/10 dark:bg-amber-400/10 blur-xl pointer-events-none" />
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-xl shadow-amber-500/25">
              <Clock className="w-10 h-10" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-brand-600 flex items-center justify-center text-white ring-4 ring-white dark:ring-slate-900 shadow-md">
              <Mail className="w-4 h-4" />
            </div>
          </div>

          {/* Title & Welcome Message */}
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Welcome, {user?.name || 'Team Member'}!
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
              You haven't been added to a workspace yet. Please wait for your company admin to send you an invitation at{' '}
              <span className="font-semibold text-slate-900 dark:text-white underline decoration-brand-500 decoration-2 underline-offset-2">
                {user?.email || 'your email address'}
              </span>
              .
            </p>
          </div>

          {/* Step Timeline */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-left space-y-3">
            <div className="flex items-start gap-3 text-xs">
              <div className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Account Created</p>
                <p className="text-slate-500 text-[11px]">Your profile is registered as an Employee.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs">
              <div className="p-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                <Clock className="w-3.5 h-3.5 animate-spin" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Awaiting Administrator Invitation</p>
                <p className="text-slate-500 text-[11px]">Your company admin will invite you to their tenant workspace.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs">
              <div className="p-1 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-400 shrink-0 mt-0.5">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-bold text-slate-400 dark:text-slate-500">Full CRM Access</p>
                <p className="text-slate-400 dark:text-slate-500 text-[11px]">
                  Accepting the invite links your account and unlocks leads, deals, and invoices.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-2">
            <button
              onClick={handleRefresh}
              disabled={isChecking}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Checking Workspace Status...' : 'Check Workspace Status'}</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full py-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign in with a different account</span>
            </button>
          </div>

          {/* Admin Note */}
          <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-1">
            Need to set up a new company?{' '}
            <button
              onClick={handleLogout}
              className="text-brand-600 dark:text-brand-400 hover:underline font-semibold cursor-pointer"
            >
              Register as Company Admin
            </button>
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-3 px-6 text-center text-xs text-slate-400 border-t border-slate-200/60 dark:border-slate-800/60">
        NexSphere Multi-Tenant Enterprise CRM &copy; {new Date().getFullYear()} &middot; Strict Tenant Isolation Guaranteed
      </footer>
    </div>
  );
};

