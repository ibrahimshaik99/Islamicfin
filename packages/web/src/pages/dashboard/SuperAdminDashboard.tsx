import { DashboardLayout } from '../../components/DashboardLayout';
import { adminNav } from '../../lib/navigation';
import { useApi } from '../../lib/useApi';
import { LoadingState, ErrorState } from '../../components/ui';
import { Link } from 'react-router-dom';
import type { AdminDashboard } from '../../lib/types';

export default function SuperAdminDashboard() {
  const { data, loading, error, refetch } = useApi<AdminDashboard>('/admin/dashboard');

  return (
    <DashboardLayout title="Dashboard" navItems={adminNav} navTitle="Admin">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {data && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Platform Overview</h1>
              <p className="text-sm text-slate-500 mt-1">Real-time overview of your Islamic Community Platform</p>
            </div>
            <button onClick={refetch} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              Refresh
            </button>
          </div>

          {/* Primary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/admin/communities" className="block group">
              <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-lg hover:border-primary-200 transition-all duration-300 cursor-pointer">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-primary-50 to-transparent rounded-bl-[4rem] -mr-6 -mt-6" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-primary-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                    </div>
                    <span className="text-xs text-primary-600 font-medium bg-primary-50 px-2 py-1 rounded-full">View All</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{data.communities?.total ?? 0}</p>
                  <p className="text-sm text-slate-500 mt-1">Communities</p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-xs text-green-600 font-medium">{data.communities?.active ?? 0} active</span>
                  </div>
                </div>
              </div>
            </Link>

            <Link to="/admin/users" className="block group">
              <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-lg hover:border-blue-200 transition-all duration-300 cursor-pointer">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-[4rem] -mr-6 -mt-6" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                      </svg>
                    </div>
                    <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-full">View All</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{data.users?.total ?? 0}</p>
                  <p className="text-sm text-slate-500 mt-1">Users</p>
                  <div className="flex items-center gap-1 mt-2">
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-xs text-green-600 font-medium">{data.users?.active ?? 0} active</span>
                  </div>
                </div>
              </div>
            </Link>

            <Link to="/admin/merchants" className="block group">
              <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-lg hover:border-amber-200 transition-all duration-300 cursor-pointer">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-50 to-transparent rounded-bl-[4rem] -mr-6 -mt-6" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
                      <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />
                      </svg>
                    </div>
                    <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded-full">View All</span>
                  </div>
                  <p className="text-3xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{data.merchants?.total ?? 0}</p>
                  <p className="text-sm text-slate-500 mt-1">Merchants</p>
                  {(data.merchants?.pending ?? 0) > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-xs text-amber-600 font-medium">{data.merchants.pending} pending</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>

            <div className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 p-5">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-50 to-transparent rounded-bl-[4rem] -mr-6 -mt-6" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                    </svg>
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">{data.orders?.total ?? 0}</p>
                <p className="text-sm text-slate-500 mt-1">Total Orders</p>
              </div>
            </div>
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/admin/merchants?status=PENDING" className="block group">
              <div className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md hover:border-amber-200 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-600">{data.merchants?.pending ?? 0}</p>
                    <p className="text-xs text-slate-500">Pending Review</p>
                  </div>
                </div>
              </div>
            </Link>

            <Link to="/admin/shariah" className="block group">
              <div className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md hover:border-purple-200 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{data.finance?.pendingReviews ?? 0}</p>
                    <p className="text-xs text-slate-500">Shariah Reviews</p>
                  </div>
                </div>
              </div>
            </Link>

            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{data.crowdfunding?.active ?? 0}</p>
                  <p className="text-xs text-slate-500">Active Projects</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{data.kameti?.total ?? 0}</p>
                  <p className="text-xs text-slate-500">Kameti Groups</p>
                </div>
              </div>
            </div>
          </div>

          {/* Activity & Health Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Recent Activity</h3>
                <Link to="/admin/audit" className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1">
                  View all
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              </div>
              <div className="p-6">
                {data.recentAuditLogs?.length > 0 ? (
                  <div className="space-y-0">
                    {data.recentAuditLogs.slice(0, 6).map((log, i) => (
                      <div key={log.id} className="flex items-center justify-between text-sm py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 rounded-lg px-3 -mx-3 transition-colors" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                            <span className="h-2 w-2 rounded-full bg-primary-500" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-slate-900 font-medium truncate block">{log.action}</span>
                            <span className="text-xs text-slate-400">{log.entityType}</span>
                          </div>
                        </div>
                        <span className="text-xs text-slate-400 shrink-0 ml-2">{new Date(log.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-8">No recent activity</p>
                )}
              </div>
            </div>

            {/* Platform Health */}
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Platform Health</h3>
              </div>
              <div className="p-6 space-y-5">
                <HealthRow label="Communities" value={data.communities?.active ?? 0} total={data.communities?.total ?? 0} color="bg-primary-500" />
                <HealthRow label="Users" value={data.users?.active ?? 0} total={data.users?.total ?? 0} color="bg-blue-500" />
                <HealthRow label="Merchants" value={data.merchants?.total ?? 0} total={Math.max(data.merchants?.total ?? 1, 1)} color="bg-amber-500" />
                <HealthRow label="Reviews" value={data.finance?.pendingReviews ?? 0} total={Math.max((data.finance?.pendingReviews ?? 0) + 10, 1)} color="bg-purple-500" />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link to="/admin/communities" className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-primary-200 hover:bg-primary-50/50 hover:shadow-sm transition-all duration-200 group">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                  <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-primary-700 block">Manage Communities</span>
                  <span className="text-xs text-slate-400">View and manage all communities</span>
                </div>
              </Link>
              <Link to="/admin/merchants?status=PENDING" className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-amber-200 hover:bg-amber-50/50 hover:shadow-sm transition-all duration-200 group">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                  <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-amber-700 block">Review Merchants</span>
                  <span className="text-xs text-slate-400">Approve pending merchants</span>
                </div>
              </Link>
              <Link to="/admin/shariah" className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-purple-200 hover:bg-purple-50/50 hover:shadow-sm transition-all duration-200 group">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-700 group-hover:text-purple-700 block">Shariah Reviews</span>
                  <span className="text-xs text-slate-400">Review pending contracts</span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function HealthRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-2">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="text-slate-900 font-semibold">{value}/{total}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
