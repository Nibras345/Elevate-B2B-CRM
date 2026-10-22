import React, { useState, useEffect, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Building2,
  Mail,
  KeyRound,
  Lock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  RefreshCw,
  Sparkles,
  Check,
} from 'lucide-react';
import { useNotification } from '../../context/NotificationContext';

export const ForgotPassword: React.FC = () => {
  // Step state: 1 = Email, 2 = OTP Verification, 3 = New Password, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form states
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI States
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const { notify } = useNotification();
  const navigate = useNavigate();

  // Handle resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Step 1: Send OTP to Email
  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Please provide a valid email address.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/users/forgot-password', {
        email: cleanEmail,
      });

      const message = response.data.message || 'OTP verification code sent to your email!';
      notify(message, 'success');
      setStep(2);
      setResendCooldown(60); // 60 seconds cooldown before next resend
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || 'Unable to send OTP. Please check the email address and try again.';
      setError(errorMsg);
      notify(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    const cleanOtp = otp.trim();

    if (!cleanOtp || cleanOtp.length !== 6) {
      setError('Please enter a valid 6-digit OTP code.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/users/verify-otp', {
        email: email.trim(),
        otp: cleanOtp,
      });

      const message = response.data.message || 'OTP verified successfully!';
      notify(message, 'success');
      setStep(3);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || 'Invalid or Expired OTP. Please check your code or request a new one.';
      setError(errorMsg);
      notify(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP handler for Step 2
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('/api/users/forgot-password', {
        email: email.trim(),
      });

      notify(response.data.message || 'New 6-digit OTP sent to your email.', 'success');
      setResendCooldown(60);
      setOtp('');
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || 'Failed to resend OTP code. Please try again.';
      setError(errorMsg);
      notify(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Frontend validations
    if (!newPassword || newPassword.length < 8) {
      const msg = 'New password must be at least 8 characters long.';
      setError(msg);
      notify(msg, 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = 'Passwords do not match. Please ensure both fields are identical.';
      setError(msg);
      notify(msg, 'error');
      return;
    }

    setIsLoading(true);

    try {
      const response = await axios.post('/api/users/reset-password', {
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });

      const message =
        response.data.message || 'Password has been successfully updated!';
      notify(message, 'success');
      setStep(4);
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.message || 'Failed to reset password. Please try again or request a new code.';
      setError(errorMsg);
      notify(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Password requirements helper validation flags
  const isLengthValid = newPassword.length >= 8;
  const isMatchValid = newPassword.length > 0 && newPassword === confirmPassword;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex">
      {/* Left Column: SaaS Visual Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-900 text-white p-12 flex-col justify-between overflow-hidden">
        {/* Glow backdrop effects */}
        <div className="absolute top-0 -left-20 w-96 h-96 bg-brand-600/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 -right-20 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Branding */}
        <div className="relative z-10">
          <Link to="/login" className="inline-flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-brand-500/30 group-hover:scale-105 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">NexSphere</span>
              <span className="text-xs uppercase font-semibold text-brand-400 block tracking-wider">
                Enterprise Multi-Tenant CRM
              </span>
            </div>
          </Link>
        </div>

        {/* Center Content */}
        <div className="relative z-10 max-w-lg space-y-6 my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>High-Security Enterprise Recovery</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Encrypted OTP-backed credentials recovery for your team workspace.
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed">
            Protecting your multi-tenant data is our top priority. We use time-delimited, single-use security tokens delivered directly to your verified corporate email address.
          </p>

          <div className="space-y-3 pt-2">
            {[
              'Cryptographically secure 6-digit one-time password (OTP)',
              '10-minute automated security token expiration window',
              'Bcryptjs salted credential protection with zero plaintext persistence',
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

        {/* Bottom SOC2 Trust Badge */}
        <div className="relative z-10 pt-8 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Enterprise Account Shield • TLS 1.3 End-to-End</span>
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>SOC2 Type II Verified</span>
          </div>
        </div>
      </div>

      {/* Right Column: Interactive Reset Card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          {/* Header & Back Link */}
          <div>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors mb-4 group"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Sign In</span>
            </Link>

            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {step === 1 && 'Reset Your Password'}
              {step === 2 && 'Enter Verification Code'}
              {step === 3 && 'Set New Password'}
              {step === 4 && 'Password Updated!'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {step === 1 && 'Enter your registered work email to receive a 6-digit OTP code.'}
              {step === 2 && `Enter the 6-digit code sent to ${email}.`}
              {step === 3 && 'Create a strong, secure new password for your account.'}
              {step === 4 && 'Your password has been changed. You can now log in.'}
            </p>
          </div>

          {/* Stepper Progress Bar (Only during steps 1-3) */}
          {step <= 3 && (
            <div className="flex items-center justify-between relative pb-2">
              <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 dark:bg-slate-800 -z-0" />
              <div
                className="absolute top-4 left-6 h-0.5 bg-brand-600 transition-all duration-500 -z-0"
                style={{
                  width: step === 1 ? '0%' : step === 2 ? '50%' : '100%',
                }}
              />

              {/* Step 1 Indicator */}
              <div className="flex flex-col items-center z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step > 1
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                      : step === 1
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30 ring-4 ring-brand-100 dark:ring-brand-900/40'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {step > 1 ? <Check className="w-4 h-4 stroke-[3]" /> : '1'}
                </div>
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mt-1.5">
                  Email
                </span>
              </div>

              {/* Step 2 Indicator */}
              <div className="flex flex-col items-center z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step > 2
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                      : step === 2
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30 ring-4 ring-brand-100 dark:ring-brand-900/40'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {step > 2 ? <Check className="w-4 h-4 stroke-[3]" /> : '2'}
                </div>
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mt-1.5">
                  Verify OTP
                </span>
              </div>

              {/* Step 3 Indicator */}
              <div className="flex flex-col items-center z-10">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step === 3
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-500/30 ring-4 ring-brand-100 dark:ring-brand-900/40'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  3
                </div>
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mt-1.5">
                  New Password
                </span>
              </div>
            </div>
          )}

          {/* Inline Error Banner */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs animate-in fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed font-medium">{error}</div>
            </div>
          )}

          {/* ================= STEP 1: ENTER EMAIL ================= */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    autoFocus
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(null);
                    }}
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 transition-all placeholder-slate-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Sending 6-Digit OTP...</span>
                  </div>
                ) : (
                  <>
                    <span>Send OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================= STEP 2: VERIFY OTP ================= */}
          {step === 2 && (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="p-3.5 bg-brand-50/50 dark:bg-brand-950/20 border border-brand-200 dark:border-brand-900/50 rounded-xl flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <div className="truncate">
                  <span>Sent to: </span>
                  <span className="font-semibold text-slate-900 dark:text-white">{email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setError(null);
                  }}
                  className="text-brand-600 dark:text-brand-400 font-medium hover:underline flex-shrink-0 ml-2 cursor-pointer"
                >
                  Change
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  6-Digit Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    value={otp}
                    onChange={(e) => {
                      // Only allow numeric input
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtp(val);
                      setError(null);
                    }}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-lg tracking-[0.4em] font-mono text-center font-bold focus:outline-hidden focus:ring-2 focus:ring-brand-500 transition-all placeholder-slate-300 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
                  <span>OTP is valid for 10 minutes</span>
                  <span>{otp.length}/6 digits</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || otp.trim().length !== 6}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </div>
                ) : (
                  <>
                    <span>Verify OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Resend OTP Action */}
              <div className="text-center pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Didn't receive the email code?{' '}
                  {resendCooldown > 0 ? (
                    <span className="font-medium text-slate-400">
                      Resend in <span className="font-mono text-brand-600 dark:text-brand-400">{resendCooldown}s</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleResendOtp}
                      className="font-semibold text-brand-600 dark:text-brand-400 hover:underline cursor-pointer disabled:opacity-50"
                    >
                      Resend OTP
                    </button>
                  )}
                </p>
              </div>
            </form>
          )}

          {/* ================= STEP 3: NEW PASSWORD ================= */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* New Password Input */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 transition-all placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password Input */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-500 transition-all placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Real-time Requirements Indicator */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      isLengthValid
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span
                    className={
                      isLengthValid
                        ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                        : 'text-slate-500 dark:text-slate-400'
                    }
                  >
                    At least 8 characters
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center ${
                      isMatchValid
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                  <span
                    className={
                      isMatchValid
                        ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                        : 'text-slate-500 dark:text-slate-400'
                    }
                  >
                    Passwords match
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !isLengthValid || !isMatchValid}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </div>
                ) : (
                  <>
                    <span>Update Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ================= STEP 4: SUCCESS CONFIRMATION ================= */}
          {step === 4 && (
            <div className="text-center py-4 space-y-6 animate-in fade-in zoom-in-95">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                  Password Successfully Changed
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
                  Your credentials have been securely updated in the database. You can now use your new password to sign in.
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-sm shadow-md shadow-brand-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Bottom helper */}
          {step <= 3 && (
            <div className="text-center pt-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Remembered your credentials?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-brand-600 dark:text-brand-400 hover:underline"
                >
                  Sign In
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
