import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  LogOut,
  User,
  Settings,
  Shield,
  Briefcase,
  Check,
  Building,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotification } from '../../context/NotificationContext';

export const Navbar = ({ setIsMobileOpen, onOpenSearch }) => {
  const { user, tenantSettings, logout, switchRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notify } = useNotification();
  const navigate = useNavigate();

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Deal Won: $64,000',
      description: 'Starlight Enterprise Solutions signed Master Agreement',
      time: '12m ago',
      read: false,
    },
    {
      id: 2,
      title: 'New Enterprise Lead Assigned',
      description: 'Elena Rostova from Nordic Velocity Group contacted',
      time: '1h ago',
      read: false,
    },
    {
      id: 3,
      title: 'Payment Received: $81,400',
      description: 'Solaria Energy Tech settled Invoice INV-2025-002',
      time: '4h ago',
      read: false,
    },
    {
      id: 4,
      title: 'Weekly Pipeline Report Ready',
      description: 'Q1 target achievement is currently tracking at 108%',
      time: '1d ago',
      read: true,
    },
  ]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    notify('Successfully signed out of session', 'info');
    navigate('/login');
  };

  const handleRoleToggle = (targetRole) => {
    switchRole(targetRole);
    notify(`Simulated role switched to: ${targetRole}`, 'success');
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    notify('All notifications marked as read', 'info');
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile hamburger & Global Search input */}
      <div className="flex items-center gap-3 flex-1 max-w-xl">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Open mobile navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <div className="relative w-full max-w-md hidden sm:block">
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between pl-10 pr-3 py-2 text-sm text-slate-400 dark:text-slate-500 bg-slate-100/70 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 rounded-xl hover:bg-slate-100 hover:border-slate-300 dark:hover:border-slate-600 transition-all text-left group"
          >
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-slate-400 group-hover:text-brand-500 transition-colors" />
            <span className="truncate">Search leads, clients, invoices, team...</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-2 py-0.5 text-[11px] font-mono text-slate-400 bg-white dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 rounded-md shadow-2xs">
              ⌘K
            </kbd>
          </button>
        </div>
      </div>

      {/* Right Action Icons & User Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Tenant Indicator pill */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300">
          <Building className="w-3.5 h-3.5 text-brand-500" />
          <span className="truncate max-w-[150px]">{tenantSettings?.companyName || user.companyName}</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400 animate-spin-slow" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600" />
          )}
        </button>

        {/* Notifications Bell Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
            aria-label="View notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
            )}
          </button>

          {isNotificationOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white">Notifications</h4>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[11px] bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-bold rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllNotificationsAsRead}
                    className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-medium"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-80 overflow-y-auto">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex gap-3 ${
                      !item.read ? 'bg-brand-50/30 dark:bg-brand-950/20' : ''
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                        {item.description}
                      </p>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                        {item.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-center">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Showing recent alerts for Tenant {user.tenantId}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group"
          >
            <div className="relative">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-9 h-9 rounded-xl object-cover ring-2 ring-brand-500/30 group-hover:ring-brand-500 transition-all shadow-sm"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">
                {user.name}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                {user.role}
              </span>
            </div>
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
              {/* Profile Card Header */}
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                <div className="flex items-center gap-3">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-11 h-11 rounded-xl object-cover shadow-sm ring-2 ring-brand-500/20"
                  />
                  <div className="truncate">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                        <Shield className="w-3 h-3" />
                        {user.role}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Organization:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[140px]">
                    {user.companyName}
                  </span>
                </div>
              </div>

              {/* Simulation: Switch Role toggle */}
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-brand-50/40 dark:bg-brand-950/20">
                <p className="text-[11px] font-semibold text-brand-700 dark:text-brand-300 uppercase tracking-wider mb-2">
                  Simulation: Switch Role
                </p>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-200/60 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => handleRoleToggle('Company Admin')}
                    className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                      user.role === 'Company Admin'
                        ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Admin
                  </button>
                  <button
                    onClick={() => handleRoleToggle('Employee')}
                    className={`px-2 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                      user.role === 'Employee'
                        ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    Employee
                  </button>
                </div>
              </div>

              {/* Menu items */}
              <div className="p-2 space-y-0.5">
                <Link
                  to="/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  <span>My Profile & Preferences</span>
                </Link>
                <Link
                  to="/settings?tab=company"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  <span>Company Settings</span>
                </Link>
                <Link
                  to="/settings?tab=team"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  <span>Tenant Administration</span>
                </Link>
              </div>

              {/* Logout button */}
              <div className="p-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
