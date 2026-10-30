import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../lib/useApi';
import { LoadingState, ErrorState, EmptyStateCard } from '../../components/ui';
import type { KametiGroup } from '../../lib/types';

/**
 * Customer Kameti directory: active groups (joinable, with member-fill
 * progress) and past groups. `currentMembers` comes from the server-side
 * count query on GET /kameti/groups.
 */
export default function CustomerKametiPage() {
  const navigate = useNavigate();
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';

  const { data, loading, error } = useApi<KametiGroup[]>(
    communityId ? `${prefix}/kameti/groups` : null,
  );

  const groups = data || [];
  const activeGroups = groups.filter((g) => g.status === 'ACTIVE');
  const otherGroups = groups.filter((g) => g.status !== 'ACTIVE');

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-primary-700 text-white sticky top-0 z-30 safe-top">
        <div className="flex items-center h-14 px-4 max-w-lg mx-auto">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="touch-target -ml-2 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
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
          <div className="bg-white rounded-2xl border border-line shadow-card">
            <EmptyStateCard
              title="No Kameti groups"
              description="Ask your community admin to create a Kameti group, or check back later."
            />
          </div>
        )}

        {activeGroups.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <h3 className="text-base font-bold text-ink mb-3">Active Groups</h3>
            <div className="space-y-3">
              {activeGroups.map((g) => {
                const pct =
                  g.totalMembers > 0 ? Math.round((g.currentMembers / g.totalMembers) * 100) : 0;
                return (
                  <button
                    key={g.id}
                    onClick={() => navigate(`/app/kameti/${g.id}`)}
                    className="w-full bg-white rounded-2xl p-5 border border-line shadow-card text-left hover:shadow-soft transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-primary-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-lg font-bold">K</span>
                        </div>
                        <h4 className="text-sm font-bold text-ink truncate">{g.name}</h4>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 flex-shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                        Active
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-surface rounded-xl p-3">
                        <p className="text-[10px] text-muted font-medium">Contribution</p>
                        <p className="text-sm font-bold text-ink">₹{g.contributionAmount}</p>
                      </div>
                      <div className="bg-surface rounded-xl p-3">
                        <p className="text-[10px] text-muted font-medium">Frequency</p>
                        <p className="text-sm font-semibold text-ink">{g.frequency}</p>
                      </div>
                      <div className="bg-surface rounded-xl p-3">
                        <p className="text-[10px] text-muted font-medium">Members</p>
                        <p className="text-sm font-bold text-ink">
                          {g.currentMembers}/{g.totalMembers}
                        </p>
                        <div className="w-full h-1 bg-line rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {otherGroups.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 delay-200">
            <h3 className="text-base font-bold text-ink mb-3">Past Groups</h3>
            <div className="bg-white rounded-2xl border border-line shadow-card divide-y divide-line overflow-hidden">
              {otherGroups.map((g) => (
                <button
                  key={g.id}
                  onClick={() => navigate(`/app/kameti/${g.id}`)}
                  className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-surface transition-colors text-left"
                >
                  <span className="text-sm font-medium text-ink truncate">{g.name}</span>
                  <span className="text-xs text-muted bg-surface border border-line px-2 py-1 rounded-full flex-shrink-0 ml-2">
                    {g.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
