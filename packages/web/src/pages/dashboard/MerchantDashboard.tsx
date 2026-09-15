import { useAuth } from '../../context/AuthContext';
import { DashboardLayout } from '../../components/DashboardLayout';
import { merchantNav } from '../../lib/navigation';
import { useApi } from '../../lib/useApi';
import { useMerchantProfile } from '../../lib/useMerchantProfile';
import { StatCard, LoadingState, Card, CardContent } from '../../components/ui';
import { Link } from 'react-router-dom';
import type { Product, Order } from '../../lib/types';

export default function MerchantDashboard() {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';

  const { merchant } = useMerchantProfile(15000);
  const { data: products, loading: pLoading } = useApi<Product[]>(`${prefix}/products?limit=200`);
  const { data: orders, loading: oLoading } = useApi<Order[]>(`${prefix}/orders?limit=200`);

  const loading = pLoading || oLoading;
  const allProducts = products || [];
  const allOrders = orders || [];

  const todayOrders = allOrders.filter((o) => {
    const d = new Date(o.createdAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const pendingOrders = allOrders.filter((o) => o.orderStatus === 'PENDING');
  const totalRevenue = allOrders
    .filter((o) => o.orderStatus === 'DELIVERED' || o.paymentStatus === 'PAYMENT_VERIFIED')
    .reduce((sum, o) => sum + parseFloat(o.total || '0'), 0);

  const lowStockProducts = allProducts.filter((p) => p.stockQuantity <= 5 && p.status === 'ACTIVE');
  const pendingPayments = allOrders.filter((o) => o.paymentStatus === 'PAYMENT_REPORTED');

  return (
    <DashboardLayout title={merchant?.businessName || 'Merchant'} navItems={merchantNav} navTitle="Merchant">
      {loading && <LoadingState />}
      {!loading && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <Link to="/merchant/orders" className="block group">
              <StatCard label="Today's Orders" value={todayOrders.length} color="blue" className="group-hover:shadow-md group-hover:border-blue-200 transition-all cursor-pointer" />
            </Link>
            <Link to="/merchant/orders" className="block group">
              <StatCard label="Pending Orders" value={pendingOrders.length} color="amber" className="group-hover:shadow-md group-hover:border-amber-200 transition-all cursor-pointer" />
            </Link>
            <Link to="/merchant/orders" className="block group">
              <StatCard label="Revenue" value={`₹${totalRevenue.toFixed(2)}`} color="green" className="group-hover:shadow-md group-hover:border-green-200 transition-all cursor-pointer" />
            </Link>
            <Link to="/merchant/products" className="block group">
              <StatCard label="Products" value={allProducts.length} color="purple" className="group-hover:shadow-md group-hover:border-purple-200 transition-all cursor-pointer" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <Link to="/merchant/inventory" className="block group">
              <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-amber-200 transition-all duration-300">
                <p className="text-xs text-gray-500 font-medium">Low Stock Items</p>
                <p className="text-xl font-bold text-amber-600 mt-1">{lowStockProducts.length}</p>
                {lowStockProducts.length > 0 && (
                  <p className="text-xs text-amber-600 mt-0.5">Needs restocking</p>
                )}
              </div>
            </Link>
            <Link to="/merchant/orders" className="block group">
              <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:border-blue-200 transition-all duration-300">
                <p className="text-xs text-gray-500 font-medium">Payment Verification</p>
                <p className="text-xl font-bold text-blue-600 mt-1">{pendingPayments.length}</p>
                {pendingPayments.length > 0 && (
                  <p className="text-xs text-blue-600 mt-0.5">Awaiting verification</p>
                )}
              </div>
            </Link>
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="text-xs text-gray-500 font-medium">Delivered Orders</p>
              <p className="text-xl font-bold text-green-600 mt-1">
                {allOrders.filter((o) => o.orderStatus === 'DELIVERED').length}
              </p>
            </div>
          </div>

          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link to="/merchant/products" className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-primary-200 hover:bg-primary-50/50 hover:shadow-sm transition-all duration-200 group">
                  <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                    <svg className="h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-primary-700">Add Product</span>
                </Link>
                <Link to="/merchant/orders" className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-sm transition-all duration-200 group">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">View Orders</span>
                </Link>
                <Link to="/merchant/inventory" className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-amber-200 hover:bg-amber-50/50 hover:shadow-sm transition-all duration-200 group">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                    <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-amber-700">Inventory</span>
                </Link>
                <Link to="/merchant/payments" className="flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 hover:border-green-200 hover:bg-green-50/50 hover:shadow-sm transition-all duration-200 group">
                  <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-green-700">Payments</span>
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">Recent Orders</h3>
                  <Link to="/merchant/orders" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View all</Link>
                </div>
                {allOrders.length === 0 ? (
                  <p className="text-sm text-gray-500">No orders yet.</p>
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
                  <h3 className="text-sm font-semibold text-gray-900">Top Products</h3>
                  <Link to="/merchant/products" className="text-xs text-primary-600 hover:text-primary-700 font-medium">View all</Link>
                </div>
                {allProducts.length === 0 ? (
                  <p className="text-sm text-gray-500">No products yet.</p>
                ) : (
                  <div className="space-y-0">
                    {allProducts.slice(0, 5).map((p, i) => (
                      <div key={p.id} className="flex justify-between items-center text-sm py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-lg px-2 -mx-2 transition-colors" style={{ animationDelay: `${i * 50}ms` }}>
                        <div className="min-w-0">
                          <span className="text-gray-900 font-medium truncate block">{p.name}</span>
                          <span className="text-xs text-gray-400">Stock: {p.stockQuantity}</span>
                        </div>
                        <span className="text-gray-900 font-semibold shrink-0 ml-2">₹{p.price}</span>
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
