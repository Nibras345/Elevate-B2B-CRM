import React, { useState, useEffect, useCallback, FormEvent, ChangeEvent } from 'react';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import {
  CreditCard,
  CheckCircle2,
  Sparkles,
  Users,
  Building2,
  Upload,
  Copy,
  Check,
  AlertCircle,
  Clock,
  XCircle,
  Eye,
  Loader2,
  RefreshCw,
  Plus,
  ShieldCheck,
  ArrowRight,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Modal } from '../components/common/Modal';
import { SeatRequestItem } from '../types';

export const Billing: React.FC = () => {
  const { user, tenantSettings } = useAuth();
  const { notify } = useNotification();

  // Role Guard: Accessible only to Company Admin & Super Admin
  if (user && user.role !== 'Company Admin' && user.role !== 'Super Admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Seat Statistics State
  const [seatStats, setSeatStats] = useState({ usedSeats: 0, maxSeats: 5 });
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // Seat Requests History State
  const [requests, setRequests] = useState<SeatRequestItem[]>([]);
  const [isRequestsLoading, setIsRequestsLoading] = useState(true);

  // Upgrade Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'Per Seat' | 'Package'>('Per Seat');
  const [seatsToBuy, setSeatsToBuy] = useState<number>(1);
  const [bundleCount, setBundleCount] = useState<number>(1);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [transactionNote, setTransactionNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [copiedNumber, setCopiedNumber] = useState<boolean>(false);

  // Preview Modal for Screenshots
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Fetch current seat statistics
  const fetchSeatStats = useCallback(async () => {
    try {
      setIsStatsLoading(true);
      const token = localStorage.getItem('nexcrm_jwt_token');
      if (!token) return;

      const res = await axios.get('/api/tenant/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setSeatStats({
          usedSeats: Number(res.data.usedSeats) || 0,
          maxSeats: Number(res.data.maxSeats) || 5,
        });
      }
    } catch (err) {
      console.error('Failed to load seat stats:', err);
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  // Fetch my seat requests history
  const fetchMyRequests = useCallback(async () => {
    try {
      setIsRequestsLoading(true);
      const token = localStorage.getItem('nexcrm_jwt_token');
      if (!token) return;

      const res = await axios.get('/api/billing/my-requests', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success && Array.isArray(res.data.seatRequests)) {
        setRequests(res.data.seatRequests);
      }
    } catch (err) {
      console.error('Failed to load seat requests:', err);
    } finally {
      setIsRequestsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSeatStats();
    fetchMyRequests();
  }, [fetchSeatStats, fetchMyRequests]);

  // Handle plan modal opening
  const handleOpenPlanModal = (plan: 'Per Seat' | 'Package') => {
    setSelectedPlan(plan);
    if (plan === 'Per Seat') {
      setSeatsToBuy(1);
    } else {
      setBundleCount(1);
    }
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setTransactionNote('');
    setIsModalOpen(true);
  };

  // Handle file selection
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notify('Please select an image file (PNG, JPG, JPEG, WEBP)', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      notify('File size exceeds 10MB limit', 'error');
      return;
    }

    setScreenshotFile(file);
    const objectUrl = URL.createObjectURL(file);
    setScreenshotPreview(objectUrl);
  };

  // Calculate live amount & seats
  const calculateDetails = () => {
    if (selectedPlan === 'Per Seat') {
      const seats = Math.max(1, seatsToBuy);
      return {
        seats,
        amount: seats * 15,
        displayPlan: 'Per Seat Plan',
      };
    } else {
      const bundles = Math.max(1, bundleCount);
      return {
        seats: bundles * 5,
        amount: bundles * 55,
        displayPlan: 'Bundle Plan (5 Seats)',
      };
    }
  };

  const { seats: calculatedSeats, amount: calculatedAmount, displayPlan } = calculateDetails();

  // Copy payment account number (03224232219)
  const handleCopyPaymentNumber = () => {
    navigator.clipboard.writeText('03224232219');
    setCopiedNumber(true);
    notify('Copied 03224232219 to clipboard!', 'info', 2000);
    setTimeout(() => setCopiedNumber(false), 2500);
  };

  // Submit seat request form
  const handleSubmitRequest = async (e: FormEvent) => {
    e.preventDefault();

    if (!screenshotFile) {
      notify('Please upload a screenshot of your payment receipt', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = localStorage.getItem('nexcrm_jwt_token');

      const formData = new FormData();
      formData.append('planName', selectedPlan);
      formData.append('requestedSeats', String(calculatedSeats));
      formData.append('totalAmount', String(calculatedAmount));
      formData.append('screenshot', screenshotFile);
      if (transactionNote.trim()) {
        formData.append('notes', transactionNote.trim());
      }

      const res = await axios.post('/api/billing/request-seats', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data.success) {
        notify('Request sent to Super Admin', 'success');
        setIsModalOpen(false);
        setScreenshotFile(null);
        setScreenshotPreview(null);
        setTransactionNote('');
        fetchMyRequests();

        // Dispatch app-wide event
        window.dispatchEvent(new CustomEvent('crm_seat_stats_updated'));
      } else {
        notify(res.data.message || 'Failed to submit request', 'error');
      }
    } catch (err: any) {
      console.error('Request submission error:', err);
      const msg = err.response?.data?.message || 'Failed to submit seat request. Please try again.';
      notify(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'Pending').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Workspace Capacity Overview */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800">
              <CreditCard className="w-3.5 h-3.5" />
              BILLING & SEAT MANAGEMENT
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Tenant: {tenantSettings?.tenantId || user?.tenantId || ''}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Plans & Workspace Seat Allocation
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Choose a plan, submit payment via JazzCash or Easypaisa, and unlock seats for your sales team.
          </p>
        </div>

        {/* Current Seat Usage Badge */}
        <div className="flex items-center gap-3">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Current Seats
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">
                {isStatsLoading ? '...' : `${seatStats.usedSeats} / ${seatStats.maxSeats}`}
                <span className="text-xs font-medium text-slate-400 ml-1.5">In Use</span>
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              fetchSeatStats();
              fetchMyRequests();
            }}
            disabled={isStatsLoading || isRequestsLoading}
            className="p-2.5 text-slate-500 hover:text-slate-800 dark:hover:text-white rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh billing data"
          >
            <RefreshCw className={`w-4 h-4 ${isStatsLoading || isRequestsLoading ? 'animate-spin text-brand-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Pending Request Alert if any */}
      {pendingCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="text-xs">
              <span className="font-bold">Pending Super Admin Verification:</span> You have{' '}
              <strong>{pendingCount} seat upgrade request(s)</strong> currently under review. New seats will automatically
              activate upon approval.
            </div>
          </div>
          <a
            href="#requests-history"
            className="text-xs font-semibold text-amber-800 dark:text-amber-300 underline hover:no-underline whitespace-nowrap"
          >
            View Status ↓
          </a>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3 PRICING CARDS                                          */}
      {/* ======================================================== */}
      <div>
        <div className="text-center max-w-xl mx-auto mb-8">
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Flexible Plans for Growing Teams
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Seamless seat expansion verified through instant mobile banking screenshot verification.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* CARD 1: Default Plan - 5 Seats (Free) */}
          <div className="relative rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Starter
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 className="w-3 h-3" />
                  Active / Current
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Default Plan</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[32px]">
                Standard entry-level package included with your organization account.
              </p>

              <div className="mt-6 mb-6">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">$0</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1.5">/ Forever Free</span>
              </div>

              <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span><strong>5 Workspace Seats</strong> included</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Full Kanban Leads Pipeline</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Client Directory & Transaction History</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Itemized Invoices & Billing Ledger</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Multi-Tenant Data Isolation</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-default border border-slate-200 dark:border-slate-700 text-center"
              >
                Current Workspace Tier
              </button>
            </div>
          </div>

          {/* CARD 2: Per Seat Plan - $15 / Seat */}
          <div className="relative rounded-2xl bg-white dark:bg-slate-900 border-2 border-brand-500/50 dark:border-brand-500/40 p-6 flex flex-col justify-between shadow-md hover:shadow-lg transition">
            <div className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-brand-600 text-white shadow-xs">
              Flexible Scaler
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Individual Seats
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Per Seat Plan</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[32px]">
                Add precisely the exact number of seats your organization requires.
              </p>

              <div className="mt-6 mb-6">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">$15</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1.5">/ Seat</span>
              </div>

              <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" />
                  <span><strong>Custom seat count</strong> (1 or more)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" />
                  <span>Instant manual verification queue</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" />
                  <span>Permanent workspace allocation</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" />
                  <span>JazzCash & Easypaisa local transfer</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" />
                  <span>Full access to all CRM modules</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleOpenPlanModal('Per Seat')}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white shadow-sm shadow-brand-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Choose Per Seat Plan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* CARD 3: Bundle Plan - $55 / 5 Seats (Best Value) */}
          <div className="relative rounded-2xl bg-gradient-to-b from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-slate-900 border-2 border-indigo-500 dark:border-indigo-400 p-6 flex flex-col justify-between shadow-lg shadow-indigo-500/10">
            <div className="absolute -top-3.5 right-6 px-3.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md">
              ★ Best Value (Save 27%)
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Team Expansion
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Bundle Plan</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[32px]">
                High-yield volume bundle giving you 5 additional seats at a discounted rate.
              </p>

              <div className="mt-6 mb-6">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">$55</span>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">/ 5 Seats</span>
                </div>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                  Just $11 per seat (Save $20 per 5-pack)
                </span>
              </div>

              <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span><strong>+5 Team Seats</strong> added at once</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Priority Super Admin review queue</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Multi-team sales scaling</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>JazzCash & Easypaisa verified receipt</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>Lifetime workspace capacity increase</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleOpenPlanModal('Package')}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-500/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Get Bundle Plan</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* UPGRADE MODAL (MANUAL PAYMENT DETAILS & SCREENSHOT)       */}
      {/* ======================================================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (!isSubmitting) setIsModalOpen(false);
        }}
        title={`Upgrade Seats — ${displayPlan}`}
        subtitle="Transfer amount via JazzCash or Easypaisa, then upload receipt screenshot"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmitRequest} className="space-y-5">
          {/* Plan Selector / Seat Input */}
          {selectedPlan === 'Per Seat' ? (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Number of Seats to Buy ($15 / Seat)
                </label>
                <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                  Total: ${calculatedAmount}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={seatsToBuy}
                  onChange={(e) => setSeatsToBuy(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-32 px-3 py-2 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-500"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Adding <strong>+{calculatedSeats} seats</strong> to your current {seatStats.maxSeats} seats capacity
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                  Select 5-Seat Bundle Quantity ($55 / 5 Seats)
                </label>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  Total: ${calculatedAmount}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={bundleCount}
                  onChange={(e) => setBundleCount(parseInt(e.target.value) || 1)}
                  className="px-3 py-2 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={1}>1 Bundle (5 Seats) — $55</option>
                  <option value={2}>2 Bundles (10 Seats) — $110</option>
                  <option value={3}>3 Bundles (15 Seats) — $165</option>
                  <option value={4}>4 Bundles (20 Seats) — $220</option>
                  <option value={5}>5 Bundles (25 Seats) — $275</option>
                </select>
                <span className="text-xs text-indigo-700 dark:text-indigo-300">
                  Adding <strong>+{calculatedSeats} seats</strong> total
                </span>
              </div>
            </div>
          )}

          {/* STRICT REQUIREMENT: JazzCash / Easypaisa payment details */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-indigo-500/30 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-500 text-slate-950">
                  JazzCash
                </span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-500 text-slate-950">
                  Easypaisa
                </span>
                <span className="text-xs font-semibold text-slate-300">Direct Mobile Account Transfer</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Account Number (Send Exact Amount to):
              </span>
              <div className="flex items-center justify-between bg-slate-950/70 border border-slate-700/80 rounded-xl px-4 py-2.5">
                <span className="font-mono text-lg sm:text-xl font-extrabold tracking-wider text-amber-400 select-all">
                  03224232219
                </span>
                <button
                  type="button"
                  onClick={handleCopyPaymentNumber}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
                >
                  {copiedNumber ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedNumber ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1 text-slate-300">
              <div>
                <span className="text-slate-400 block text-[11px]">Account Title:</span>
                <span className="font-semibold text-white">NexSphere CRM Billing</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Amount to Send:</span>
                <span className="font-bold text-amber-300">${calculatedAmount} USD (or equivalent PKR)</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 border-t border-slate-800 pt-2 leading-relaxed">
              💡 Please transfer the amount using your JazzCash or Easypaisa mobile app, take a clear screenshot of the receipt showing the Transaction ID (TID), and attach it below.
            </p>
          </div>

          {/* Screenshot Upload Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Payment Screenshot / Receipt <span className="text-rose-500">*</span>
            </label>

            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-4 text-center hover:border-brand-500 transition-colors bg-slate-50/50 dark:bg-slate-800/40">
              {screenshotPreview ? (
                <div className="space-y-3">
                  <div className="relative inline-block group">
                    <img
                      src={screenshotPreview}
                      alt="Payment Preview"
                      className="max-h-48 mx-auto rounded-lg object-contain border border-slate-300 dark:border-slate-700 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewImage(screenshotPreview)}
                      className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white rounded-lg transition-opacity cursor-pointer"
                    >
                      <Eye className="w-6 h-6" />
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-xs">
                      {screenshotFile?.name} ({(screenshotFile?.size ? screenshotFile.size / 1024 : 0).toFixed(0)} KB)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshotFile(null);
                        setScreenshotPreview(null);
                      }}
                      className="text-xs text-rose-600 hover:underline font-semibold cursor-pointer ml-2"
                    >
                      Change File
                    </button>
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center cursor-pointer py-3">
                  <Upload className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Click to upload payment receipt screenshot
                  </span>
                  <span className="text-[11px] text-slate-400 mt-1">PNG, JPG, JPEG, or WEBP (Max 10MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    required
                  />
                </label>
              )}
            </div>
          </div>

          {/* Optional Notes or Transaction ID */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Transaction ID / Sender Details (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. TID: 09182371982 or Sender Name"
              value={transactionNote}
              onChange={(e) => setTransactionNote(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !screenshotFile}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 rounded-xl transition shadow-md shadow-brand-500/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Submitting Receipt...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit Payment Proof (${calculatedAmount})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* REQUESTS HISTORY & STATUS TABLE                          */}
      {/* ======================================================== */}
      <div id="requests-history" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Seat Upgrade Request History
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Track status of submitted payment proofs and seat allocations
            </p>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {requests.length} Total Requests
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-6">Date</th>
                <th className="py-3.5 px-6">Plan</th>
                <th className="py-3.5 px-6">Seats Added</th>
                <th className="py-3.5 px-6">Amount</th>
                <th className="py-3.5 px-6">Receipt</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Notes / Feedback</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isRequestsLoading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-brand-600 mb-2" />
                    <span>Loading requests...</span>
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <CreditCard className="w-8 h-8 mx-auto text-slate-400 mb-2 stroke-[1.5]" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">No seat upgrade requests submitted yet</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Select "Per Seat Plan" or "Bundle Plan" above to expand your workspace limit.
                    </p>
                  </td>
                </tr>
              ) : (
                requests.map((req) => (
                  <tr key={req._id || req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="py-4 px-6 whitespace-nowrap">
                      {new Date(req.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                      {req.planName}
                    </td>
                    <td className="py-4 px-6 font-bold text-brand-600 dark:text-brand-400">
                      +{req.requestedSeats} Seats
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-900 dark:text-white">
                      ${req.totalAmount}
                    </td>
                    <td className="py-4 px-6">
                      {req.screenshotUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewImage(req.screenshotUrl)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-950 transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Proof</span>
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {req.status === 'Approved' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          Approved
                        </span>
                      ) : req.status === 'Rejected' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                          <XCircle className="w-3 h-3" />
                          Rejected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          <Clock className="w-3 h-3 animate-pulse" />
                          Pending Review
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                      {req.notes || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SCREENSHOT FULL-SIZE PREVIEW MODAL                       */}
      {/* ======================================================== */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Payment Verification Screenshot
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center justify-center bg-slate-950/40 rounded-xl p-2">
              <img
                src={previewImage}
                alt="Payment Proof Full"
                className="max-h-[70vh] object-contain rounded-lg shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;

