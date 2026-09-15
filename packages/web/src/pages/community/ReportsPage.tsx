import { DashboardLayout } from '../../components/DashboardLayout';
import { communityNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../lib/useApi';
import { LoadingState, ErrorState, Card, CardContent, StatCard } from '../../components/ui';
import { useAdminList } from '../../components/admin/AdminComponents';

export default function ReportsPage() {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';

  const { data: dashboard, loading: dashLoading, error: dashError } = useApi<{ community: Record<string, unknown>; stats: Record<string, number> }>(
    communityId ? `${prefix}/dashboard` : null,
  );

  const { data: members, loading: memLoading } = useAdminList<Record<string, unknown>>({ path: `${prefix}/members`, limit: 5 });
  const { data: orders, loading: ordLoading } = useAdminList<Record<string, unknown>>({ path: `${prefix}/orders`, limit: 5 });
  const { data: merchants, loading: merLoading } = useAdminList<Record<string, unknown>>({ path: `${prefix}/merchants`, limit: 5 });
  const { data: kameti, loading: kamLoading } = useAdminList<Record<string, unknown>>({ path: `${prefix}/kameti/groups`, limit: 5 });

  const loading = dashLoading || memLoading || ordLoading || merLoading || kamLoading;

  const stats = dashboard?.stats;

  return (
    <DashboardLayout title="Reports" navItems={communityNav} navTitle="Community">
      {loading && <LoadingState />}
      {dashError && <ErrorState message={dashError} />}
      {!loading && !dashError && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-lg font-semibold text-gray-900">Community Reports</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Members" value={stats?.members ?? 0} color="blue" />
            <StatCard label="Groups" value={stats?.groups ?? 0} color="green" />
            <StatCard label="Merchants" value={stats?.merchants ?? 0} color="amber" />
            <StatCard label="Orders" value={stats?.orders ?? 0} color="purple" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Products" value={stats?.products ?? 0} color="blue" />
            <StatCard label="Announcements" value={stats?.announcements ?? 0} color="green" />
            <StatCard label="Pending Approvals" value={stats?.pendingApprovals ?? 0} color="amber" />
            <StatCard label="Kameti Groups" value={kameti.length} color="purple" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Members</h3>
                {members.length === 0 ? (
                  <p className="text-sm text-gray-500">No members yet.</p>
                ) : (
                  <div className="space-y-2">
                    {members.slice(0, 5).map((m, i) => (
                      <div key={i} className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                        <span className="text-gray-900">{String(m.userName || m.userId).slice(0, 20)}</span>
                        <span className="text-gray-500">{String(m.role).replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Orders</h3>
                {orders.length === 0 ? (
                  <p className="text-sm text-gray-500">No orders yet.</p>
                ) : (
                  <div className="space-y-2">
                    {orders.slice(0, 5).map((o, i) => (
                      <div key={i} className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                        <span className="text-gray-900">{String(o.orderNumber)}</span>
                        <span className="text-gray-500">₹{String(o.total)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Merchants</h3>
                {merchants.length === 0 ? (
                  <p className="text-sm text-gray-500">No merchants yet.</p>
                ) : (
                  <div className="space-y-2">
                    {merchants.slice(0, 5).map((m, i) => (
                      <div key={i} className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                        <span className="text-gray-900">{String(m.businessName)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          String(m.verificationStatus) === 'APPROVED' ? 'bg-green-100 text-green-700' :
                          String(m.verificationStatus) === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>{String(m.verificationStatus)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Kameti Groups</h3>
                {kameti.length === 0 ? (
                  <p className="text-sm text-gray-500">No kameti groups yet.</p>
                ) : (
                  <div className="space-y-2">
                    {kameti.slice(0, 5).map((k, i) => (
                      <div key={i} className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                        <span className="text-gray-900">{String(k.name)}</span>
                        <span className="text-gray-500">₹{String(k.contributionAmount)} / {String(k.frequency)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
