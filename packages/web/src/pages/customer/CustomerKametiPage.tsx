import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../lib/useApi';
import { LoadingState, ErrorState } from '../../components/ui';
import type { KametiGroup } from '../../lib/types';

export default function CustomerKametiPage() {
  const navigate = useNavigate();
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';

  const { data, loading, error } = useApi<KametiGroup[]>(
    communityId ? `${prefix}/kameti/groups` : null,
  );

  const groups = (data || []);
  const activeGroups = groups.filter((g) => g.status === 'ACTIVE');
  const otherGroups = groups.filter((g) => g.status !== 'ACTIVE');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/20">
      <div className="bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-500 text-white sticky top-0 z-30 safe-top animate-in fade-in">
        <div className="flex items-center h-12 px-4">
          <button onClick={() => navigate(-1)} className="touch-target -ml-2 flex items-center justify-center">
            <svg className="h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-sm font-bold ml-2">Kameti</h1>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {!loading && !error && groups.length === 0 && (
          <div className="text-center py-16 animate-in fade-in">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🏦</span>
            </div>
            <p className="text-base font-semibold text-gray-700">No Kameti groups</p>
            <p className="text-sm text-gray-400 mt-1">Ask your community admin to create a Kameti group</p>
          </div>
        )}

        {activeGroups.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-base font-bold text-gray-900 mb-3">Active Groups</h3>
            <div className="space-y-3">
              {activeGroups.map((g, i) => (
                <button
                  key={g.id}
                  onClick={() => navigate(`/app/kameti/${g.id}`)}
                  className="w-full bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-left hover:shadow-md transition-all active:scale-[0.98]"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                        <span className="text-white text-lg font-bold">K</span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-900">{g.name}</h4>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      Active
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-gray-500 font-medium">Contribution</p>
                      <p className="text-sm font-bold text-gray-900">₹{g.contributionAmount}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-gray-500 font-medium">Frequency</p>
                      <p className="text-sm font-semibold text-gray-900">{g.frequency}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-[10px] text-gray-500 font-medium">Members</p>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-gray-900">{g.currentMembers}/{g.totalMembers}</p>
                      </div>
                      <div className="w-full h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full" style={{ width: `${g.totalMembers > 0 ? Math.round((g.currentMembers / g.totalMembers) * 100) : 0}%` }} />
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {otherGroups.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 delay-200">
            <h3 className="text-base font-bold text-gray-900 mb-3">Past Groups</h3>
            <div className="space-y-2">
              {otherGroups.map((g) => (
                <div key={g.id} className="bg-white rounded-xl p-4 border border-gray-100 flex items-center justify-between opacity-60">
                  <span className="text-sm font-medium text-gray-700">{g.name}</span>
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">{g.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
