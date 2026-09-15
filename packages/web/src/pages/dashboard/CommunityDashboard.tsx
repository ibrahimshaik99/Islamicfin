import { useAuth } from '../../context/AuthContext';
import { DashboardLayout } from '../../components/DashboardLayout';
import { communityNav } from '../../lib/navigation';
import { useApi } from '../../lib/useApi';
import { StatCard, LoadingState, ErrorState, Card, CardContent } from '../../components/ui';
import { Link } from 'react-router-dom';
import type { Announcement, KametiGroup } from '../../lib/types';

export default function CommunityDashboard() {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';

  const { data, loading, error, refetch } = useApi<{ community: Record<string, unknown>; stats: { members: number; groups: number; announcements: number; merchants: number; products: number; orders: number; pendingApprovals: number } }>(
    communityId ? `${prefix}/dashboard` : null,
  );

  const { data: announcements } = useApi<Announcement[]>(
    communityId ? `${prefix}/announcements` : null,
  );

  const { data: kametiGroups } = useApi<KametiGroup[]>(
    communityId ? `${prefix}/kameti/groups` : null,
  );

  const stats = data?.stats;
  const recentAnnouncements = (announcements || []).slice(0, 5);
  const activeKameti = (kametiGroups || []).filter((g) => g.status === 'ACTIVE').slice(0, 5);

  return (
    <DashboardLayout title={String(data?.community?.name || 'Community')} navItems={communityNav} navTitle="Community">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {data && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Link to="/community/members" className="block group">
              <StatCard label="Members" value={stats?.members ?? 0} color="blue" className="group-hover:shadow-md group-hover:border-blue-200 transition-all cursor-pointer" />
            </Link>
            <Link to="/community/merchants" className="block group">
              <StatCard label="Merchants" value={stats?.merchants ?? 0} color="green" className="group-hover:shadow-md group-hover:border-green-200 transition-all cursor-pointer" />
            </Link>
            <Link to="/community/orders" className="block group">
              <StatCard label="Orders" value={stats?.orders ?? 0} color="amber" className="group-hover:shadow-md group-hover:border-amber-200 transition-all cursor-pointer" />
            </Link>
            <Link to="/community/kameti" className="block group">
              <StatCard label="Kameti Groups" value={activeKameti.length} color="purple" className="group-hover:shadow-md group-hover:border-purple-200 transition-all cursor-pointer" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Link to="/community/marketplace" className="block group">
              <StatCard label="Products" value={stats?.products ?? 0} color="green" className="group-hover:shadow-md group-hover:border-green-200 transition-all cursor-pointer" />
            </Link>
            <Link to="/community/announcements" className="block group">
              <StatCard label="Announcements" value={stats?.announcements ?? 0} color="amber" className="group-hover:shadow-md group-hover:border-amber-200 transition-all cursor-pointer" />
            </Link>
            <Link to="/community/merchants" className="block group">
              <StatCard label="Pending Approvals" value={stats?.pendingApprovals ?? 0} color="purple" className="group-hover:shadow-md group-hover:border-purple-200 transition-all cursor-pointer" />
            </Link>
          </div>

          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Link to="/community/members" className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm transition-all duration-200 group">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">Add Member</span>
                </Link>
                <Link to="/community/announcements" className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-amber-200 hover:bg-amber-50/50 hover:shadow-sm transition-all duration-200 group">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                    <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-amber-700">Create Announcement</span>
                </Link>
                <Link to="/community/kameti" className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-purple-200 hover:bg-purple-50/50 hover:shadow-sm transition-all duration-200 group">
                  <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                    <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">Create Kameti</span>
                </Link>
                <Link to="/community/crowdfunding" className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-red-200 hover:bg-red-50/50 hover:shadow-sm transition-all duration-200 group">
                  <div className="w-9 h-9 rounded-lg bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                    <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-red-700">Create Project</span>
                </Link>
                <Link to="/community/merchants" className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/50 hover:shadow-sm transition-all duration-200 group">
                  <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                    <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0021 9.349" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-emerald-700">Add Merchant</span>
                </Link>
                <Link to="/community/services" className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-cyan-200 hover:bg-cyan-50/50 hover:shadow-sm transition-all duration-200 group">
                  <div className="w-9 h-9 rounded-lg bg-cyan-100 flex items-center justify-center group-hover:bg-cyan-200 transition-colors">
                    <svg className="h-4 w-4 text-cyan-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m0 0L11.42 4.97m-5.1 5.1H21M3 3v18" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-cyan-700">Services</span>
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Recent Announcements</h3>
                  <Link to="/community/announcements" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View all</Link>
                </div>
                {recentAnnouncements.length === 0 ? (
                  <p className="text-sm text-gray-500">No announcements yet.</p>
                ) : (
                  <div className="space-y-0">
                    {recentAnnouncements.map((a, i) => (
                      <div key={a.id} className="flex items-center justify-between text-sm py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-lg px-2 -mx-2 transition-colors" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary-400 shrink-0" />
                          <span className="text-gray-900 truncate">{a.title}</span>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0 ml-2">{new Date(a.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Active Kameti Groups</h3>
                  <Link to="/community/kameti" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View all</Link>
                </div>
                {activeKameti.length === 0 ? (
                  <p className="text-sm text-gray-500">No active kameti groups.</p>
                ) : (
                  <div className="space-y-0">
                    {activeKameti.map((k, i) => (
                      <div key={k.id} className="flex items-center justify-between text-sm py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-lg px-2 -mx-2 transition-colors" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
                          <span className="text-gray-900 truncate">{k.name}</span>
                        </div>
                        <span className="text-xs text-gray-500 shrink-0 ml-2">₹{k.contributionAmount} / {k.frequency}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      {!loading && !error && !data && (
        <ErrorState title="No community found" message="Create or join a community to get started." />
      )}
    </DashboardLayout>
  );
}
