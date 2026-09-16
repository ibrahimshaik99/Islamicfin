import { useState, useMemo, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { merchantNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../lib/useApi';
import { LoadingState, ErrorState, Card, CardContent, StatCard } from '../../components/ui';
import { DataTable } from '../../components/admin/AdminComponents';
import type { Order } from '../../lib/types';

interface CustomerInfo {
  [key: string]: unknown;
  id: string;
  orderCount: number;
  totalSpentPaise: number;
  lastOrderDate: string;
}

function toPaise(amount: string): number {
  return Math.round(parseFloat(amount || '0') * 100);
}

function formatRupees(paise: number): string {
  return `\u20B9${(paise / 100).toFixed(2)}`;
}

export default function CustomersPage() {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [search, setSearch] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const { data, loading, error, refetch } = useApi<Order[]>(`${prefix}/orders?limit=100`);



  const handleManualRefresh = useCallback(() => {
    refetch();
    setLastRefreshed(new Date());
  }, [refetch]);

  const customers = useMemo(() => {
    const map = new Map<string, CustomerInfo>();
    const orders = data || [];
    orders.forEach((o) => {
      const cid = String(o.customerId);
      const existing = map.get(cid) || { id: cid, orderCount: 0, totalSpentPaise: 0, lastOrderDate: '' };
      existing.orderCount += 1;
      existing.totalSpentPaise += toPaise(o.total);
      if (!existing.lastOrderDate || new Date(o.createdAt) > new Date(existing.lastOrderDate)) {
        existing.lastOrderDate = o.createdAt;
      }
      map.set(cid, existing);
    });
    return Array.from(map.values());
  }, [data]);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) => c.id.toLowerCase().includes(q));
  }, [customers, search]);

  const summary = useMemo(() => {
    const totalRevenuePaise = customers.reduce((sum, c) => sum + c.totalSpentPaise, 0);
    const totalOrders = customers.reduce((sum, c) => sum + c.orderCount, 0);
    const avgOrderPaise = totalOrders > 0 ? Math.round(totalRevenuePaise / totalOrders) : 0;
    return {
      totalCustomers: customers.length,
      totalRevenuePaise,
      avgOrderPaise,
    };
  }, [customers]);

  const columns = [
    {
      key: 'id',
      label: 'Customer ID',
      render: (item: Record<string, unknown>) => (
        <span className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded">
          {String(item.id).slice(0, 8)}...
        </span>
      ),
    },
    {
      key: 'orderCount',
      label: 'Orders',
      render: (item: Record<string, unknown>) => (
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary-50 text-primary-700 text-xs font-semibold">
          {String(item.orderCount)}
        </span>
      ),
    },
    {
      key: 'totalSpentPaise',
      label: 'Total Spent',
      render: (item: Record<string, unknown>) => (
        <span className="text-sm font-semibold text-gray-900">
          {formatRupees(Number(item.totalSpentPaise))}
        </span>
      ),
    },
    {
      key: 'lastOrderDate',
      label: 'Last Order',
      render: (item: Record<string, unknown>) => (
        <span className="text-sm text-gray-500">
          {item.lastOrderDate ? new Date(String(item.lastOrderDate)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout title="Customers" navItems={merchantNav} navTitle="Merchant">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Customers</h2>
              <p className="mt-1 text-sm text-gray-500">View customers who have placed orders from your store</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 hidden sm:block">Updated {lastRefreshed.toLocaleTimeString()}</span>
              <button
                onClick={handleManualRefresh}
                className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                title="Refresh"
              >
                ↻
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Total Customers"
              value={summary.totalCustomers}
              color="primary"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              }
            />
            <StatCard
              label="Total Revenue"
              value={formatRupees(summary.totalRevenuePaise)}
              color="green"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="Avg. Order Value"
              value={formatRupees(summary.avgOrderPaise)}
              color="blue"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
              }
            />
          </div>

          <Card>
            <CardContent>
              <div className="flex items-center gap-3 mb-5">
                <div className="relative flex-1 max-w-sm">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by customer ID..."
                    className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
                  />
                </div>
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                )}
              </div>

              <DataTable columns={columns} data={filtered} loading={false} error={null} emptyMessage="No customers found" />
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
