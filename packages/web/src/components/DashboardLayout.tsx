import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './Sidebar';
import { PwaInstallPrompt } from './PwaInstallPrompt';
import type { NavItem } from '../lib/navigation';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  COMMUNITY_OWNER: 'Owner',
  COMMUNITY_ADMIN: 'Admin',
  COMMUNITY_FINANCE_MANAGER: 'Finance',
  COMMUNITY_MODERATOR: 'Moderator',
  MERCHANT: 'Merchant',
  MERCHANT_STAFF: 'Staff',
  CUSTOMER: 'Customer',
};

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
  COMMUNITY_OWNER: 'bg-primary-100 text-primary-700 border-primary-200',
  COMMUNITY_ADMIN: 'bg-blue-100 text-blue-700 border-blue-200',
  MERCHANT: 'bg-amber-100 text-amber-700 border-amber-200',
  CUSTOMER: 'bg-gray-100 text-gray-600 border-gray-200',
};

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  navItems: NavItem[];
  navTitle: string;
}

export function DashboardLayout({ children, title, navItems, navTitle }: DashboardLayoutProps) {
  const { user, logout, primaryRole } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const role = primaryRole || 'USER';
  const roleLabel = ROLE_LABELS[role] || role.replace(/_/g, ' ');
  const roleColor = ROLE_COLORS[role] || 'bg-gray-100 text-gray-600 border-gray-200';
  const initials = user?.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || '??';
  const showPwaPrompt = role === 'CUSTOMER';

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {showPwaPrompt && <PwaInstallPrompt />}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar items={navItems} title={navTitle} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-700 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${roleColor}`}>
                  {roleLabel}
                </span>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-primary-500/20">
                {initials}
              </div>
              <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors">
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
