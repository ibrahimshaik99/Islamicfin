import { useAuth } from '../../context/AuthContext';
import { DashboardLayout } from '../../components/DashboardLayout';
import { customerNav } from '../../lib/navigation';
import { useApi } from '../../lib/useApi';
import { StatCard, LoadingState, Card, CardContent } from '../../components/ui';
import { Link } from 'react-router-dom';
import type { Order, CrowdfundingContribution } from '../../lib/types';

export default function CustomerDashboard() {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const { data: orders, loading: oLoading } = useApi<Order[]>(`${prefix}/orders`);
  const { data: contributions, loading: cLoading } = useApi<CrowdfundingContribution[]>(`${prefix}/crowdfunding/contributions`);

  const loading = oLoading || cLoading;
  const allOrders = orders || [];
  const allContributions = contributions || [];

  const pendingOrders = allOrders.filter((o) => o.orderStatus === 'PENDING');
  const totalSpent = allOrders
    .filter((o) => o.orderStatus === 'DELIVERED' || o.paymentStatus === 'PAYMENT_VERIFIED')
    .reduce((sum, o) => sum + parseFloat(o.total || '0'), 0);

  return (
    <DashboardLayout title="My Dashboard" navItems={customerNav} navTitle="ICP">
      {loading && <LoadingState />}
      {!loading && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <Link to="/customer/orders" className="block group">
              <StatCard label="My Orders" value={allOrders.length} color="blue" className="group-hover:shadow-md group-hover:border-blue-200 transition-all cursor-pointer" />
            </Link>
            <Link to="/customer/contributions" className="block group">
              <StatCard label="Contributions" value={allContributions.length} color="green" className="group-hover:shadow-md group-hover:border-green-200 transition-all cursor-pointer" />
            </Link>
            <StatCard label="Total Spent" value={`₹${totalSpent.toFixed(2)}`} color="amber" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link to="/customer/orders" className="block group">
              <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-blue-200 transition-all duration-300">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <p className="text-xs text-gray-500 font-medium">Pending Orders</p>
                </div>
                <p className="text-xl font-bold text-amber-600">{pendingOrders.length}</p>
              </div>
            </Link>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <p className="text-xs text-gray-500 font-medium">Delivered</p>
              </div>
              <p className="text-xl font-bold text-green-600">{allOrders.filter((o) => o.orderStatus === 'DELIVERED').length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">My Orders</h3>
                  <Link to="/customer/orders" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View all</Link>
                </div>
                {allOrders.length === 0 ? (
                  <p className="text-sm text-gray-500">No orders yet. Browse the marketplace to shop.</p>
                ) : (
                  <div className="space-y-0">
                    {allOrders.slice(0, 5).map((o, i) => (
                      <div key={o.id} className="flex justify-between items-center text-sm py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-lg px-2 -mx-2 transition-colors" style={{ animationDelay: `${i * 50}ms` }}>
                        <div>
                          <span className="text-gray-900 font-medium">#{o.orderNumber}</span>
                          <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                            o.orderStatus === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                            o.orderStatus === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {o.orderStatus}
                          </span>
                        </div>
                        <span className="text-gray-900 font-semibold">₹{o.total}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">My Contributions</h3>
                  <Link to="/customer/contributions" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View all</Link>
                </div>
                {allContributions.length === 0 ? (
                  <p className="text-sm text-gray-500">No contributions yet.</p>
                ) : (
                  <div className="space-y-0">
                    {allContributions.slice(0, 5).map((c, i) => (
                      <div key={c.id} className="flex justify-between items-center text-sm py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-lg px-2 -mx-2 transition-colors" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-400 shrink-0" />
                          <span className="text-gray-900 font-medium">₹{c.amount}</span>
                        </div>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          c.status === 'VERIFIED' ? 'bg-green-100 text-green-700' :
                          c.status === 'REPORTED' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>{c.status}</span>
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
