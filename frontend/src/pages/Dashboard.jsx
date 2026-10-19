import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Award,
  Percent,
  Calendar,
  Download,
  Plus,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Receipt,
  KanbanSquare,
  Sparkles,
} from 'lucide-react';
import { dashboardAnalytics } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export const Dashboard = () => {
  const { user } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();

  const [timeRange, setTimeRange] = useState('This Month');
  const [activeActivityTab, setActiveActivityTab] = useState('all');
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState(null);

  const kpis = dashboardAnalytics.kpis;
  const monthlyData = dashboardAnalytics.monthlyRevenue;
  const stageFunnel = dashboardAnalytics.stageFunnel;
  const activities = dashboardAnalytics.recentActivities;

  const filteredActivities = activeActivityTab === 'all'
    ? activities
    : activities.filter(a => a.type === activeActivityTab);

  // SVG Chart Calculations for Sales Over Time
  const maxRevenue = Math.max(...monthlyData.map(d => Math.max(d.revenue, d.target)));
  const chartHeight = 220;
  const chartWidth = 650;
  const paddingX = 40;
  const paddingY = 30;

  const points = monthlyData.map((d, i) => {
    const x = paddingX + (i / (monthlyData.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (d.revenue / maxRevenue) * (chartHeight - paddingY * 2);
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => (
    i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`
  ), '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

  const handleExport = () => {
    notify('Executive KPI summary report exported as CSV', 'info');
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
              {user.role}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time pipeline analytics, revenue forecasting, and activity for {user.companyName}
          </p>
        </div>

        {/* Date Filter & Export buttons */}
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
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export</span>
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
        {kpis.map((kpi) => {
          let icon = DollarSign;
          let glowClass = 'hover:border-indigo-500/50 hover:shadow-glow-indigo';
          let iconBg = 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400';
          let borderGlow = 'border-indigo-500/20';

          if (kpi.id === 'kpi-leads') {
            icon = Users;
            glowClass = 'hover:border-emerald-500/50 hover:shadow-glow-emerald';
            iconBg = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400';
            borderGlow = 'border-emerald-500/20';
          } else if (kpi.id === 'kpi-deals') {
            icon = Award;
            glowClass = 'hover:border-amber-500/50 hover:shadow-glow-amber';
            iconBg = 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400';
            borderGlow = 'border-amber-500/20';
          } else if (kpi.id === 'kpi-conv') {
            icon = Percent;
            glowClass = 'hover:border-purple-500/50 hover:shadow-glow-indigo';
            iconBg = 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400';
            borderGlow = 'border-purple-500/20';
          }

          const IconComponent = icon;

          return (
            <div
              key={kpi.id}
              className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/90 dark:border-slate-800 shadow-sm transition-all duration-300 relative overflow-hidden group ${glowClass}`}
            >
              {/* Subtle gradient corner glow */}
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-brand-500/5 dark:bg-brand-500/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {kpi.title}
                </span>
                <div className={`p-2.5 rounded-xl ${iconBg} transition-transform group-hover:scale-110 duration-200`}>
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

      {/* Analytical Visual Graphs Grid (Sales Over Time + Leads by Stage) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph 1: Sales Over Time (Gradient Area Chart) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Revenue Performance & Targets</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-full">
                  +18.4% YoY
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Monthly billed revenue versus enterprise target quota
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium">
              <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-3 h-3 rounded-full bg-brand-500" />
                <span>Actual Revenue</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-0.5 bg-slate-400 border-dashed" />
                <span>Target Quota</span>
              </div>
            </div>
          </div>

          {/* Interactive SVG Graph */}
          <div className="mt-6 relative w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-56 overflow-visible"
            >
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.45" />
                  <stop offset="75%" stopColor="#6366f1" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
                return (
                  <line
                    key={ratio}
                    x1={paddingX}
                    y1={y}
                    x2={chartWidth - paddingX}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-200 dark:text-slate-800"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Area Fill */}
              <path d={areaD} fill="url(#revenueGradient)" />

              {/* Target Line */}
              {points.map((p, i) => {
                if (i === 0) return null;
                const prev = points[i - 1];
                const yPrev = chartHeight - paddingY - (prev.target / maxRevenue) * (chartHeight - paddingY * 2);
                const yCurr = chartHeight - paddingY - (p.target / maxRevenue) * (chartHeight - paddingY * 2);
                return (
                  <line
                    key={`target-${i}`}
                    x1={prev.x}
                    y1={yPrev}
                    x2={p.x}
                    y2={yCurr}
                    stroke="#94a3b8"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                );
              })}

              {/* Actual Line */}
              <path
                d={pathD}
                fill="none"
                stroke="#4f46e5"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Interactive Dots */}
              {points.map((p, i) => (
                <g key={i} className="cursor-pointer">
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hoveredMonthIndex === i ? 6 : 4}
                    className="fill-white dark:fill-slate-900 stroke-brand-600 transition-all duration-150"
                    strokeWidth="3"
                    onMouseEnter={() => setHoveredMonthIndex(i)}
                    onMouseLeave={() => setHoveredMonthIndex(null)}
                  />
                  {/* Month Label */}
                  <text
                    x={p.x}
                    y={chartHeight - 8}
                    textAnchor="middle"
                    className="text-[10px] font-semibold fill-slate-400 dark:fill-slate-500"
                  >
                    {p.month}
                  </text>
                </g>
              ))}
            </svg>

            {/* Hover Tooltip display */}
            {hoveredMonthIndex !== null && (
              <div
                className="absolute top-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs py-1.5 px-3 rounded-lg shadow-xl border border-slate-700 pointer-events-none animate-in fade-in"
              >
                <div className="font-semibold text-brand-300">
                  {points[hoveredMonthIndex].month} 2024-25
                </div>
                <div className="flex gap-3 mt-0.5">
                  <span>Actual: <strong className="text-white">${points[hoveredMonthIndex].revenue.toLocaleString()}</strong></span>
                  <span>Target: <strong className="text-slate-300">${points[hoveredMonthIndex].target.toLocaleString()}</strong></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Graph 2: Leads by Stage (Funnel & Distribution) */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Leads by Pipeline Stage
              </h3>
              <button
                onClick={() => navigate('/leads')}
                className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-semibold flex items-center gap-1"
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
              {stageFunnel.map((item) => (
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
                      className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                      style={{ width: `${item.percentage}%` }}
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
              <span className="text-sm font-bold text-slate-900 dark:text-white">$1,057,000</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Avg Win Rate</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">26.4%</span>
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
              {['all', 'deal', 'invoice', 'lead'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveActivityTab(tab)}
                  className={`px-3 py-1 rounded-lg capitalize font-medium transition-all ${
                    activeActivityTab === tab
                      ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Activities Timeline */}
          <div className="mt-5 space-y-4">
            {filteredActivities.map((act) => (
              <div
                key={act.id}
                className="flex items-start gap-3.5 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
              >
                <img
                  src={act.avatar}
                  alt={act.user}
                  className="w-9 h-9 rounded-xl object-cover ring-2 ring-slate-100 dark:ring-slate-800 flex-shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-xs text-slate-800 dark:text-slate-200">
                      <span className="font-bold text-slate-900 dark:text-white">{act.user}</span>{' '}
                      <span className="text-slate-500">{act.action}</span> for{' '}
                      <span className="font-semibold text-brand-600 dark:text-brand-400">{act.target}</span>
                    </p>
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                      {act.value}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {act.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Quick Action Widget & Pipeline Shortcuts */}
        <div className="space-y-4">
          <div className="bg-gradient-to-br from-brand-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg shadow-brand-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full text-brand-100 inline-block mb-3">
                Tenant ID: {user.tenantId}
              </span>
              <h4 className="text-xl font-bold leading-snug">
                Ready to accelerate Q1 quota?
              </h4>
              <p className="text-xs text-brand-100 mt-2 leading-relaxed">
                You have 3 enterprise proposals pending client signature worth $266,000.
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
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500 hover:bg-brand-50/50 dark:hover:bg-brand-950/40 text-left transition-all"
              >
                <KanbanSquare className="w-5 h-5 text-brand-500 mb-1" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Kanban Board</span>
                <span className="text-[10px] text-slate-400">10 active deals</span>
              </button>

              <button
                onClick={() => navigate('/invoices')}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-brand-500 hover:bg-brand-50/50 dark:hover:bg-brand-950/40 text-left transition-all"
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
