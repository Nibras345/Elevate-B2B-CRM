import React, { useState, useEffect, FormEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import {
  Building2,
  Lock,
  User,
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  BadgeCheck,
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

interface InvitationDetails {
  email: string;
  role: string;
  department: string;
  companyName: string;
  tenantId: string;
  expiresAt: string;
  isExistingUser?: boolean;
  existingUserName?: string;
}

export const AcceptInvite: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { notify } = useNotification();

  // Page initialization states
  const [isVerifying, setIsVerifying] = useState(true);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Fetch and validate invitation token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenError('Invitation token is missing from the URL.');
        setIsVerifying(false);
        return;
      }

      try {
        const response = await axios.get(`/api/team/invitation/${token}`);
        if (response.data.success && response.data.invitation) {
          setInvitation(response.data.invitation);
          if (response.data.invitation.existingUserName) {
            setFullName(response.data.invitation.existingUserName);
          }
        } else {
          setTokenError(response.data.message || 'Invalid or expired invitation token.');
        }
      } catch (err: any) {
        const errMsg =
          err.response?.data?.message ||
          'This invitation link is invalid, expired, or has already been used.';
        setTokenError(errMsg);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const isExistingUser = invitation?.isExistingUser;

    if (!isExistingUser) {
      if (!fullName.trim()) {
        setFormError('Please enter your full legal name.');
        return;
      }

      if (password.length < 8) {
        setFormError('Password must contain at least 8 characters.');
        return;
      }

      if (password !== confirmPassword) {
        setFormError('Passwords do not match. Please re-enter carefully.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Route 3: POST /api/team/accept-invite/:token
      const payload = isExistingUser
        ? { fullName: fullName.trim() || invitation?.existingUserName }
        : { fullName: fullName.trim(), newPassword: password };

      const response = await axios.post(`/api/team/accept-invite/${token}`, payload);

      if (response.data.success) {
        setIsSuccess(true);
        notify(
          isExistingUser
            ? 'Workspace joined successfully!'
            : 'Account successfully activated! Welcome to the team.',
          'success'
        );

        // If backend returned a JWT token and user info, store them
        if (response.data.token) {
          localStorage.setItem('nexcrm_jwt_token', response.data.token);
          if (response.data.user) {
            localStorage.setItem(
              'nexcrm_user',
              JSON.stringify({
                id: response.data.user.id,
                name: response.data.user.name,
                fullName: response.data.user.name,
                email: response.data.user.email,
                role: response.data.user.role,
                department: response.data.user.department,
                tenantId: response.data.user.tenantId,
                companyName: response.data.user.companyName,
                avatar:
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                joinedDate: 'Active Member',
              })
            );
          }
        }
      } else {
        setFormError(response.data.message || 'Failed to activate account.');
      }
    } catch (err: any) {
      const errMsg =
        err.response?.data?.message ||
        'Error completing account setup. Please check your network or contact support.';
      setFormError(errMsg);
      notify(errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex">
      {/* Left Column: Visual SaaS Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 text-white p-12 flex-col justify-between overflow-hidden">
        {/* Decorative glowing gradient meshes */}
        <div className="absolute top-0 -left-20 w-96 h-96 bg-brand-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

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
            <span>Official Colleague Onboarding</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            You've been invited to join a collaborative enterprise revenue team.
          </h1>

          <div className="space-y-4 pt-2">
            {[
              'Direct access to tenant-isolated deals and sales pipelines',
              'Real-time team collaboration, invoices, and client directories',
              'Enterprise-grade cryptographic security and role permissions',
            ].map((text, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-sm text-slate-300">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Security Footer */}
        <div className="relative z-10 flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Encrypted Invitation Token · Multi-Tenant Isolation Verified</span>
        </div>
      </div>

      {/* Right Column: Interaction Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Header Branding */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-lg font-bold text-slate-900 dark:text-white">NexSphere CRM</span>
          </div>

          {/* STATE 1: Token Verifying */}
          {isVerifying && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4">
              <Loader2 className="w-10 h-10 text-brand-600 animate-spin mx-auto" />
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Verifying Invitation Link...
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Validating cryptographic token and tenant security context
                </p>
              </div>
            </div>
          )}

          {/* STATE 2: Token Invalid / Expired */}
          {!isVerifying && tokenError && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-rose-200 dark:border-rose-950/60 shadow-sm text-center space-y-5">
              <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-rose-50 dark:ring-rose-950/20">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Invitation Invalid or Expired
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto leading-relaxed">
                  {tokenError}
                </p>
              </div>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors shadow-sm"
                >
                  <span>Return to Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {/* STATE 3: Success Screen */}
          {!isVerifying && !tokenError && isSuccess && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-emerald-200 dark:border-emerald-950/60 shadow-sm text-center space-y-5">
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-emerald-50 dark:ring-emerald-950/20">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Welcome to {invitation?.companyName || 'NexSphere'}!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Your account has been activated with role{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {invitation?.role}
                  </strong>
                  . You're ready to explore your workspace!
                </p>
              </div>
              <div className="pt-3">
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 transition-all shadow-md shadow-brand-500/25 cursor-pointer"
                >
                  <span>Launch Workspace Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STATE 4: Active Acceptance Form */}
          {!isVerifying && !tokenError && !isSuccess && invitation && (
            <div>
              {/* Header */}
              <div className="space-y-2 mb-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-950/50 border border-brand-200 dark:border-brand-800 text-[11px] font-semibold text-brand-700 dark:text-brand-300">
                  <BadgeCheck className="w-3.5 h-3.5 text-brand-600" />
                  <span>Invited by {invitation.companyName}</span>
                </div>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Accept Your Team Invitation
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Finalize your name and password to activate your seat
                </p>
              </div>

              {/* Invitation Summary Card */}
              <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 mb-5 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                  <span>Assigned Role</span>
                  <span className="font-semibold text-slate-900 dark:text-white px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                    {invitation.role}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                  <span>Department</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {invitation.department}
                  </span>
                </div>
                <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                  <span>Tenant Identifier</span>
                  <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                    {invitation.tenantId}
                  </span>
                </div>
              </div>

              {/* Error Alert */}
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Invited Email (Read-Only) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Invited Work Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      disabled
                      value={invitation.email}
                      className="w-full pl-9 pr-9 py-2.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-300 font-medium cursor-not-allowed"
                    />
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                {/* Conditionally display password setup for new users vs one-click accept for existing users */}
                {invitation.isExistingUser ? (
                  <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 text-xs text-indigo-700 dark:text-indigo-300 space-y-1.5">
                    <div className="font-semibold flex items-center gap-1.5 text-indigo-900 dark:text-indigo-200">
                      <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Existing Account Recognized</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-indigo-600 dark:text-indigo-400">
                      You are already registered on NexSphere CRM. Accepting will immediately attach{' '}
                      <strong>{invitation.companyName}</strong> to your profile. You do not need to create a new password.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Full Legal Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Samuel Vance"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Create Secure Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="Minimum 8 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full pl-9 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          placeholder="Re-enter your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-9 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-500/25 flex items-center justify-center gap-2 disabled:opacity-60 transition-all cursor-pointer mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{invitation.isExistingUser ? 'Joining Workspace...' : 'Activating Seat...'}</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {invitation.isExistingUser
                          ? 'Accept Invitation & Join Workspace'
                          : 'Activate Account & Enter Workspace'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="pt-4 text-center">
                <span className="text-xs text-slate-400">
                  Already have an active account?{' '}
                  <Link
                    to="/login"
                    className="text-brand-600 dark:text-brand-400 font-semibold hover:underline"
                  >
                    Sign In
                  </Link>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
