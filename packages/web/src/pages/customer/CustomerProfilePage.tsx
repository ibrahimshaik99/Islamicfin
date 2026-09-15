import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function CustomerProfilePage() {
  const navigate = useNavigate();
  const { user, memberships, logout } = useAuth();
  const membership = memberships?.[0] ?? null;

  const handleLogout = async () => {
    await logout();
    navigate('/signin');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-50/20">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-500 to-emerald-500 text-white safe-top animate-in fade-in">
        <div className="px-4 pt-5 pb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
              <span className="text-2xl font-bold">{user?.name?.charAt(0) || '?'}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">{user?.name}</h1>
              <p className="text-sm text-white/70">{user?.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-3 pb-8 max-w-lg mx-auto">
        {membership ? (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Community</h3>
            <p className="text-sm font-bold text-gray-900">{membership.communityName}</p>
            <p className="text-xs text-gray-500 mt-1">{membership.role.replace(/_/g, ' ')}</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Community</h3>
            <p className="text-sm text-gray-500">No community joined yet</p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 delay-100">
          <MenuItem label="My Orders" onClick={() => navigate('/app/orders')} icon={
            <svg className="h-5 w-5 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          } />
          <MenuItem label="Zakat Calculator" onClick={() => navigate('/app/zakat')} icon={
            <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          } />
          <MenuItem label="Settings" onClick={() => navigate('/app/more')} icon={
            <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          } />
        </div>

        <button
          onClick={handleLogout}
          className="w-full bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-sm font-bold text-red-500 flex items-center justify-center gap-2 hover:bg-red-50 transition-colors animate-in fade-in slide-in-from-bottom-4 delay-200"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
}

function MenuItem({ label, onClick, icon }: { label: string; onClick: () => void; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-4 border-b border-gray-50 last:border-0 touch-target hover:bg-gray-50 transition-colors"
    >
      {icon}
      <span className="flex-1 text-sm font-medium text-gray-900 text-left">{label}</span>
      <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </button>
  );
}
