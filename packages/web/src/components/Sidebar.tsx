import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface NavItem {
  label: string;
  path: string;
  icon?: ReactNode;
}

interface SidebarProps {
  items: NavItem[];
  title: string;
  onClose?: () => void;
}

export function Sidebar({ items, title, onClose }: SidebarProps) {
  const location = useLocation();

  return (
    <div className="flex flex-col h-full bg-sidebar text-white">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight">ICP</h1>
            <p className="text-[10px] text-white/50 font-medium uppercase tracking-wider">{title}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-white/50 hover:text-white transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {items.map((item) => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white/15 text-white shadow-lg shadow-black/10'
                  : 'text-white/60 hover:bg-white/8 hover:text-white'
              }`}
            >
              <span className={`flex-shrink-0 ${isActive ? 'text-white' : 'text-white/40'}`}>{item.icon}</span>
              {item.label}
              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400 shadow-lg shadow-primary-400/50" />}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-[10px] text-white/30 text-center">Islamic Community Platform</p>
      </div>
    </div>
  );
}
