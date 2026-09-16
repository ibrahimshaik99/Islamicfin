import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { adminNav } from '../../lib/navigation';
import { useAdminList, StatusBadge, Pagination, FilterSelect, SearchInput, DataTable } from '../../components/admin/AdminComponents';
import { Card, CardContent } from '../../components/ui';

export default function OrdersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { data, pagination, loading, error, refetch, setPage } = useAdminList<{ id: string; orderNumber: string; customerName: string; communityName: string; total: string; orderStatus: string; paymentStatus: string; paymentMethod: string; createdAt: string }>({
    path: '/admin/orders',
    search,
    filters: statusFilter ? { status: statusFilter } : {},
  });
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleManualRefresh = useCallback(() => {
    refetch();
    setLastRefreshed(new Date());
  }, [refetch]);

  const columns = [
    { key: 'orderNumber', label: 'Order #', render: (item: { orderNumber: string }) => <span className="font-medium text-gray-900">{item.orderNumber}</span> },
    { key: 'customerName', label: 'Customer', render: (item: { customerName: string }) => <span className="text-gray-900">{item.customerName}</span> },
    { key: 'communityName', label: 'Community', render: (item: { communityName: string }) => <span className="text-gray-500 text-xs">{item.communityName}</span> },
    { key: 'total', label: 'Total', render: (item: { total: string }) => <span className="font-medium text-gray-900">₹{parseFloat(item.total).toLocaleString('en-IN')}</span> },
    { key: 'orderStatus', label: 'Order Status', render: (item: { orderStatus: string }) => <StatusBadge status={item.orderStatus} /> },
    { key: 'paymentStatus', label: 'Payment Status', render: (item: { paymentStatus: string }) => <StatusBadge status={item.paymentStatus} /> },
    { key: 'paymentMethod', label: 'Payment Method', render: (item: { paymentMethod: string }) => <span className="text-gray-500 text-xs">{item.paymentMethod}</span> },
    { key: 'createdAt', label: 'Date', render: (item: { createdAt: string }) => new Date(item.createdAt).toLocaleDateString() },
  ];

  return (
    <DashboardLayout title="Orders" navItems={adminNav} navTitle="Admin">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Card>
            <CardContent>
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{pagination?.total ?? 0}</p>
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search orders..." /></div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-400 hidden sm:block">Updated {lastRefreshed.toLocaleTimeString()}</span>
            <button
              onClick={handleManualRefresh}
              className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              title="Refresh"
            >
              ↻
            </button>
            <FilterSelect label="" value={statusFilter} onChange={setStatusFilter} options={[
              { value: '', label: 'All Status' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'CONFIRMED', label: 'Confirmed' },
              { value: 'PROCESSING', label: 'Processing' },
              { value: 'DELIVERED', label: 'Delivered' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100">
          <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No orders found" onRetry={refetch} />
          {pagination && <div className="px-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>}
        </div>
      </div>
    </DashboardLayout>
  );
}
