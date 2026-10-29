import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { Modal } from '../common/Modal';
import { Search, ArrowRight, KanbanSquare, Users, Receipt, Settings, LucideIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PendingInviteScreen } from '../../pages/PendingInviteScreen';

interface QuickLink {
  title: string;
  category: string;
  path: string;
  icon: LucideIcon;
}

export const ShellLayout: React.FC = () => {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Keyboard shortcut listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Waiting Room Guard: If user has no assigned tenantId, skip rendering full CRM layout.
  // This halts all child useEffect API calls that would trigger 400 Bad Request errors.
  if (user && !user.tenantId) {
    return <PendingInviteScreen />;
  }

  const quickLinks: QuickLink[] = [
    { title: 'Pipeline Kanban Board', category: 'Pages', path: '/leads', icon: KanbanSquare },
    { title: 'Client Directory & Database', category: 'Pages', path: '/clients', icon: Users },
    { title: 'Invoicing & PDF Generator', category: 'Pages', path: '/invoices', icon: Receipt },
    { title: 'Company Settings & RBAC', category: 'Administration', path: '/settings', icon: Settings },
  ];

  const filteredLinks = quickLinks.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectLink = (path: string) => {
    navigate(path);
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          setIsMobileOpen={setIsMobileOpen}
          onOpenSearch={() => setIsSearchOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-200">
          <Outlet />
        </main>
      </div>

      {/* Global Command / Search Palette Modal */}
      <Modal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        title="Quick Navigation & Global Search"
        subtitle="Search across CRM leads, client database, invoices, and tenant administration"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3.5 top-3 text-brand-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type a page name or keyword..."
              autoFocus
              className="w-full pl-11 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>

          <div className="space-y-1.5 pt-2">
            <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2">
              Suggested Shortcuts
            </p>
            {filteredLinks.length > 0 ? (
              filteredLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleSelectLink(item.path)}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-400">{item.category}</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-brand-500 transition-all" />
                  </button>
                );
              })
            ) : (
              <div className="py-8 text-center text-sm text-slate-500">
                No matching results found for "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};
