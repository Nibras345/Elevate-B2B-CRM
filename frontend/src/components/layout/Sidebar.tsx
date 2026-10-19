import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  Receipt,
  UserCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building2,
  Sparkles,
  LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: LucideIcon;
  badge: string | null;
  isActiveMatch?: (pathname: string, search: string) => boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const { user, tenantSettings } = useAuth();
  const location = useLocation();

  const navItems: NavItem[] = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      name: 'Leads Pipeline',
      path: '/leads',
      icon: KanbanSquare,
      badge: '10',
    },
    {
      name: 'Clients',
      path: '/clients',
      icon: Users,
      badge: null,
    },
    {
      name: 'Invoices',
      path: '/invoices',
      icon: Receipt,
      badge: '3',
    },
    {
      name: 'Team Members',
      path: '/settings?tab=team',
      icon: UserCheck,
      badge: null,
      isActiveMatch: (pathname: string, search: string) => pathname === '/settings' && search.includes('tab=team'),
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: Settings,
      badge: null,
      isActiveMatch: (pathname: string, search: string) => pathname === '/settings' && !search.includes('tab=team'),
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen flex flex-col justify-between bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Top Header / Brand Logo */}
        <div>
          <div className="flex items-center justify-between h-16 px-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-brand-500/25 flex-shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              {!isCollapsed && (
                <div className="flex flex-col truncate">
                  <span className="font-bold text-slate-900 dark:text-white tracking-tight truncate flex items-center gap-1.5 text-base">
                    {tenantSettings?.companyName || user.companyName}
                  </span>
                  <span className="text-[10px] uppercase font-semibold text-brand-600 dark:text-brand-400 tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Tenant: {user.tenantId}
                  </span>
                </div>
              )}
            </div>

            {/* Collapse button for desktop */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <div className="p-3 space-y-1">
            <div className={`px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 ${isCollapsed ? 'text-center' : ''}`}>
              {isCollapsed ? '•••' : 'Main Menu'}
            </div>

            {navItems.map((item) => {
              const Icon = item.icon;
              const isCustomActive = item.isActiveMatch
                ? item.isActiveMatch(location.pathname, location.search)
                : location.pathname === item.path && !location.search.includes('tab=team');

              return (
                <NavLink
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 group relative ${
                    isCustomActive
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${
                      isCustomActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate flex-1">{item.name}</span>}

                  {!isCollapsed && item.badge && (
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        isCustomActive
                          ? 'bg-brand-600 text-brand-100'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                      {item.name}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Bottom Multi-Tenant Plan Card / Profile Info */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          {!isCollapsed ? (
            <div className="p-3 rounded-xl bg-gradient-to-br from-slate-50 to-brand-50/50 dark:from-slate-800/80 dark:to-slate-800/30 border border-slate-200/80 dark:border-slate-700/60">
              <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-4 h-4 text-brand-500" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Enterprise Tier
                </span>
                <span className="text-[10px] bg-brand-100 text-brand-700 dark:bg-brand-900/60 dark:text-brand-300 font-bold px-1.5 py-0.2 rounded ml-auto">
                  SaaS
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Multi-tenant isolation active. Unlimited pipelines.
              </p>
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300 font-medium pt-2 border-t border-slate-200/60 dark:border-slate-700/40">
                <span>Seats in use</span>
                <span className="font-semibold text-brand-600 dark:text-brand-400">18 / 25</span>
              </div>
            </div>
          ) : (
            <div className="flex justify-center p-2" title="Enterprise Multi-Tenant Active">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
