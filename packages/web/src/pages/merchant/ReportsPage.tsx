import { useMemo, useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { merchantNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../lib/useApi';
import { LoadingState, ErrorState, Card, CardContent, StatCard } from '../../components/ui';
import type { Product, Order } from '../../lib/types';

function toPaise(amount: string): number {
  return Math.round(parseFloat(amount || '0') * 100);
}

function formatRupees(paise: number): string {
  return `\u20B9${(paise / 100).toFixed(2)}`;
}

export default function MerchantReportsPage() {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const orderParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('limit', '200');
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    return params.toString();
  }, [dateFrom, dateTo]);

  const { data: products, loading: pLoading, error: pError } = useApi<Product[]>(`${prefix}/products?limit=200`);
  const { data: orders, loading: oLoading, error: oError } = useApi<Order[]>(`${prefix}/orders?${orderParams}`);

  const loading = pLoading || oLoading;
  const error = pError || oError;

  const stats = useMemo(() => {
    const productList = products || [];
    const orderList = orders || [];

    const deliveredOrders = orderList.filter(
      (o) => o.orderStatus === 'DELIVERED' || o.paymentStatus === 'PAYMENT_VERIFIED'
    );
    const totalRevenuePaise = deliveredOrders.reduce((sum, o) => sum + toPaise(o.total), 0);

    const pendingOrders = orderList.filter((o) => o.orderStatus === 'PENDING').length;
    const deliveredCount = orderList.filter((o) => o.orderStatus === 'DELIVERED').length;

    const activeProducts = productList.filter((p) => p.status === 'ACTIVE').length;
    const lowStock = productList.filter((p) => p.stockQuantity <= 5 && p.status === 'ACTIVE').length;

    return {
      totalRevenuePaise,
      totalOrders: orderList.length,
      activeProducts,
      lowStock,
      pendingOrders,
      deliveredOrders: deliveredCount,
      totalProducts: productList.length,
    };
  }, [products, orders]);

  return (
    <DashboardLayout title="Reports" navItems={merchantNav} navTitle="Merchant">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}
      {!loading && !error && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Merchant Reports</h2>
            <p className="mt-1 text-sm text-gray-500">Overview of your store performance</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <span className="text-sm font-medium text-gray-700">Date Range:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium"
              >
                Clear
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Revenue"
              value={formatRupees(stats.totalRevenuePaise)}
              color="green"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="Total Orders"
              value={stats.totalOrders}
              color="primary"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              }
            />
            <StatCard
              label="Active Products"
              value={stats.activeProducts}
              color="blue"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              }
            />
            <StatCard
              label="Low Stock Items"
              value={stats.lowStock}
              color="amber"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardContent>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Order Summary</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-400" />
                      <span className="text-sm text-gray-600">Pending Orders</span>
                    </div>
                    <span className="text-sm font-semibold text-yellow-600">{stats.pendingOrders}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-sm text-gray-600">Delivered Orders</span>
                    </div>
                    <span className="text-sm font-semibold text-green-600">{stats.deliveredOrders}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary-400" />
                      <span className="text-sm font-medium text-gray-900">Total Orders</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{stats.totalOrders}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Product Summary</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-sm text-gray-600">Active Products</span>
                    </div>
                    <span className="text-sm font-semibold text-green-600">{stats.activeProducts}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-sm text-gray-600">Low Stock Items</span>
                    </div>
                    <span className="text-sm font-semibold text-amber-600">{stats.lowStock}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary-400" />
                      <span className="text-sm font-medium text-gray-900">Total Products</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{stats.totalProducts}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
