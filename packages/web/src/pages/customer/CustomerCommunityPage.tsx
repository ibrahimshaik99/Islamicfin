import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../lib/useApi';
import { LoadingState, EmptyState, UserAvatar, Badge } from '../../components/ui';
import type { Announcement, CommunityGroup, CommunityMember } from '../../lib/types';

/**
 * Customer community hub.
 *
 * Tabs: Announcements | Groups | Members — each backed by the tenant-scoped
 * community endpoints (community:read). Emails are intentionally not rendered
 * for regular members.
 */

type Tab = 'announcements' | 'groups' | 'members';

const TABS: { id: Tab; label: string }[] = [
  { id: 'announcements', label: 'Announcements' },
  { id: 'groups', label: 'Groups' },
  { id: 'members', label: 'Members' },
];

export default function CustomerCommunityPage() {
  const { communityId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const raw = searchParams.get('tab');
  const tab: Tab = raw === 'groups' ? 'groups' : raw === 'members' ? 'members' : 'announcements';

  const prefix = communityId ? `/communities/${communityId}` : '';

  const { data: announcements, loading: aLoad, error: aError } = useApi<Announcement[]>(
    communityId && tab === 'announcements' ? `${prefix}/announcements?limit=50` : null,
  );
  const { data: groups, loading: gLoad, error: gError } = useApi<CommunityGroup[]>(
    communityId && tab === 'groups' ? `${prefix}/groups?limit=50` : null,
  );
  const { data: members, loading: mLoad, error: mError } = useApi<CommunityMember[]>(
    communityId && tab === 'members' ? `${prefix}/members?limit=50` : null,
  );

  const setTab = (id: Tab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', id);
    setSearchParams(next, { replace: true });
  };

  const loading = aLoad || gLoad || mLoad;
  const error = aError || gError || mError;

  const published = (announcements || []).filter((a) => a.status === 'PUBLISHED');
  const activeGroups = (groups || []).filter((g) => g.status === 'ACTIVE');
  const activeMembers = (members || []).filter((m) => m.status === 'ACTIVE');

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-line safe-top">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-ink">Community</h1>
          <p className="text-xs text-muted mt-0.5">Announcements, groups and members of your community</p>

          {/* Tabs */}
          <div className="flex gap-1 mt-3 bg-surface rounded-xl p-1 border border-line" role="tablist" aria-label="Community sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors touch-target ${
                  tab === t.id
                    ? 'bg-white text-primary-700 shadow-card'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 pb-8">
        {loading && <LoadingState />}
        {error && (
          <EmptyState
            title="Could not load this section"
            description={error}
          />
        )}

        {/* Announcements */}
        {!loading && !error && tab === 'announcements' && (
          <>
            {published.length === 0 ? (
              <EmptyState
                title="No announcements yet"
                description="Updates and news from your community will appear here."
              />
            ) : (
              <div className="space-y-3">
                {published.map((a) => (
                  <article key={a.id} className="bg-white rounded-2xl p-4 border border-line shadow-card">
                    <div className="flex items-start gap-3">
                      <span className="w-9 h-9 rounded-xl bg-gold-50 text-gold-600 flex items-center justify-center flex-shrink-0">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-ink">{a.title}</h3>
                          {a.audience && <Badge variant="info">{a.audience}</Badge>}
                        </div>
                        <p className="text-sm text-muted mt-1.5 leading-relaxed whitespace-pre-line">{a.content}</p>
                        <p className="text-[11px] text-muted/70 mt-2">
                          {new Date(a.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {/* Groups */}
        {!loading && !error && tab === 'groups' && (
          <>
            {activeGroups.length === 0 ? (
              <EmptyState
                title="No groups yet"
                description="Community groups created by your admins will appear here."
              />
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {activeGroups.map((g) => (
                  <div key={g.id} className="bg-white rounded-2xl p-4 border border-line shadow-card">
                    <div className="flex items-start gap-3">
                      <span className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0 font-bold">
                        {g.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-ink">{g.name}</h3>
                        {g.description && (
                          <p className="text-xs text-muted mt-1 line-clamp-2">{g.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="success">Active</Badge>
                          <span className="text-[11px] text-muted">
                            {(g as CommunityGroup & { memberCount?: number }).memberCount ?? 0} members
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Members */}
        {!loading && !error && tab === 'members' && (
          <>
            {activeMembers.length === 0 ? (
              <EmptyState
                title="No members found"
                description="Members of your community will appear here."
              />
            ) : (
              <div className="bg-white rounded-2xl border border-line shadow-card divide-y divide-line">
                {activeMembers.map((m) => {
                  const name = m.userName || m.name || 'Member';
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-4">
                      <UserAvatar name={name} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink truncate">{name}</p>
                        <p className="text-xs text-muted">
                          Joined {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
                        </p>
                      </div>
                      <RoleBadge role={m.role} />
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'COMMUNITY_OWNER') return <Badge variant="warning">Owner</Badge>;
  if (role === 'COMMUNITY_ADMIN') return <Badge variant="info">Admin</Badge>;
  if (role === 'COMMUNITY_MODERATOR') return <Badge variant="info">Moderator</Badge>;
  if (role === 'COMMUNITY_FINANCE_MANAGER') return <Badge variant="success">Finance</Badge>;
  if (role === 'MERCHANT') return <Badge>Merchant</Badge>;
  return null;
}
