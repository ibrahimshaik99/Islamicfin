import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { Sidebar } from '../../components/Sidebar';
import { customerNav } from '../../lib/navigation';

/**
 * Customer chrome.
 *
 * Mobile: fixed bottom navigation (Home / Marketplace / Community / Finance / More).
 * Desktop (>=lg): persistent professional sidebar built from customerNav.
 * All five bottom destinations map to real routes — no decorative items.
 */
const NAV_ITEMS = [
  { label: 'Home', path: '/app', icon: (active: boolean) => (
    <svg className="h-6 w-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )},
  { label: 'Marketplace', path: '/app/marketplace', icon: (active: boolean) => (
    <svg className="h-6 w-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
    </svg>
  )},
  { label: 'Community', path: '/app/community', icon: (active: boolean) => (
    <svg className="h-6 w-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  )},
  { label: 'Finance', path: '/app/finance', icon: (active: boolean) => (
    <svg className="h-6 w-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )},
  { label: 'More', path: '/app/more', icon: (active: boolean) => (
    <svg className="h-6 w-6" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
    </svg>
  )},
];

export function CustomerShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { totalItems } = useCart();

  return (
    <div className="min-h-screen bg-surface pb-nav lg:pb-0">
      {/* Desktop sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-64 z-40">
        <Sidebar items={customerNav} title="Barakah" />
      </div>

      {/* Page content */}
      <main className="min-h-screen lg:pl-64">{children}</main>

      {/* Bottom Navigation (mobile/tablet) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-line z-40 safe-bottom lg:hidden shadow-[0_-2px_10px_-4px_rgba(7,91,70,0.12)]">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = item.path === '/app'
              ? location.pathname === '/app'
              : location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <NavLink
                key={item.path}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-center w-16 h-14 touch-target transition-colors ${
                  isActive ? 'text-primary-600' : 'text-muted'
                }`}
              >
                <div className="relative">
                  {item.icon(isActive)}
                  {item.label === 'Marketplace' && totalItems > 0 && (
                    <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] flex items-center justify-center px-1">
                      {totalItems > 99 ? '99+' : totalItems}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
                {isActive && <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-primary-600" />}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
