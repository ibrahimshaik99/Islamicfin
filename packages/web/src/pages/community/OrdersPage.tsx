import { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { communityNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useMutation } from '../../lib/useApi';
import { LoadingState, ErrorState, Card, CardContent } from '../../components/ui';
import { useAdminList, DataTable, StatusBadge, Pagination, ConfirmDialog, SearchInput } from '../../components/admin/AdminComponents';

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'] as const;

export default function OrdersPage() {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [statusTarget, setStatusTarget] = useState<{ id: string; orderNumber: string; currentStatus: string } | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [cancelTarget, setCancelTarget] = useState<{ id: string; orderNumber: string } | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { mutate, loading: mutating, error: mutateError } = useMutation();

  const { data, pagination, loading, error, refetch, setPage, setFilters, setSearch: setServerSearch } = useAdminList<Record<string, unknown>>({
    path: `${prefix}/orders`,
    limit: 20,
    filters: statusFilter ? { status: statusFilter } : {},
  });

  const handleSearch = (value: string) => {
    setSearch(value);
    setServerSearch(value);
  };

  const handleStatusUpdate = async () => {
    if (!statusTarget || !newStatus) return;
    const result = await mutate(`${prefix}/orders/${statusTarget.id}/status`, { method: 'PATCH', body: { status: newStatus } });
    if (result !== null) {
      setActionMessage({ type: 'success', text: `Order #${statusTarget.orderNumber} status updated to ${newStatus.replace(/_/g, ' ')}` });
      setTimeout(() => setActionMessage(null), 3000);
    }
    setStatusTarget(null); setNewStatus('');
    refetch();
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    const result = await mutate(`${prefix}/orders/${cancelTarget.id}/cancel`, { method: 'POST' });
    if (result !== null) {
      setActionMessage({ type: 'success', text: `Order #${cancelTarget.orderNumber} cancelled` });
      setTimeout(() => setActionMessage(null), 3000);
    }
    setCancelTarget(null);
    refetch();
  };

  const columns = [
    { key: 'orderNumber', label: 'Order #' },
    { key: 'customerName', label: 'Customer', render: (item: Record<string, unknown>) => (
      <span className="text-sm text-slate-600">{String(item.customerName || item.customerUserId || '-')}</span>
    )},
    { key: 'merchantName', label: 'Merchant', render: (item: Record<string, unknown>) => (
      <span className="text-sm text-slate-600">{String(item.merchantName || '-')}</span>
    )},
    { key: 'total', label: 'Total', render: (item: Record<string, unknown>) => (
      <span className="text-sm font-medium text-slate-900">₹{String(item.total)}</span>
    )},
    { key: 'orderStatus', label: 'Status', render: (item: Record<string, unknown>) => <StatusBadge status={String(item.orderStatus)} /> },
    { key: 'paymentStatus', label: 'Payment', render: (item: Record<string, unknown>) => <StatusBadge status={String(item.paymentStatus)} /> },
    { key: 'paymentMethod', label: 'Method', render: (item: Record<string, unknown>) => (
      <span className="text-sm text-slate-500">{String(item.paymentMethod)}</span>
    )},
    { key: 'createdAt', label: 'Date', render: (item: Record<string, unknown>) => (
      <span className="text-sm text-slate-500">{new Date(String(item.createdAt)).toLocaleDateString()}</span>
    )},
    { key: 'actions', label: '', render: (item: Record<string, unknown>) => {
      const status = String(item.orderStatus);
      return (
        <div className="flex gap-2">
          {status !== 'CANCELLED' && status !== 'DELIVERED' && (
            <button onClick={() => { setStatusTarget({ id: String(item.id), orderNumber: String(item.orderNumber), currentStatus: status }); setNewStatus(status); }}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium">Update</button>
          )}
          {status === 'PENDING' && (
            <button onClick={() => setCancelTarget({ id: String(item.id), orderNumber: String(item.orderNumber) })}
              className="text-xs text-red-600 hover:text-red-700 font-medium">Cancel</button>
          )}
        </div>
      );
    }},
  ];

  return (
    <DashboardLayout title="Orders" navItems={communityNav} navTitle="Community">
      {actionMessage && (
        <div className={`mb-4 px-4 py-3 rounded-2xl text-sm font-medium ${actionMessage.type === 'success' ? 'bg-teal-50 text-teal-800 border border-teal-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {actionMessage.text}
        </div>
      )}
      {mutateError && (
        <div className="mb-4 px-4 py-3 rounded-2xl text-sm font-medium bg-red-50 text-red-800 border border-red-200">
          {mutateError}
        </div>
      )}
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Community Orders ({data.length})</h2>
            <div className="flex items-center gap-3">
              <SearchInput value={search} onChange={handleSearch} placeholder="Search orders..." />
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setFilters(e.target.value ? { status: e.target.value } : {}); }}
                className="text-sm border border-slate-300 rounded-2xl px-3 py-2">
                <option value="">All Status</option>
                {ORDER_STATUSES.map((s) => (<option key={s} value={s}>{s.replace(/_/g, ' ')}</option>))}
              </select>
              <button onClick={() => { refetch(); }} className="text-xs text-teal-600 hover:text-teal-700 font-medium">Refresh</button>
            </div>
          </div>
          <Card>
            <CardContent>
              <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No orders yet" />
              {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
            </CardContent>
          </Card>
        </div>
      )}
      {statusTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Update Order Status</h3>
            <p className="text-sm text-slate-500 mb-4">Order #{statusTarget.orderNumber}</p>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-2xl focus:ring-2 focus:ring-teal-500 outline-none">
              {ORDER_STATUSES.map((s) => (<option key={s} value={s}>{s.replace(/_/g, ' ')}</option>))}
            </select>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setStatusTarget(null); setNewStatus(''); }} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-2xl hover:bg-slate-200">Cancel</button>
              <button onClick={handleStatusUpdate} disabled={mutating || newStatus === statusTarget.currentStatus} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-2xl hover:bg-teal-700 disabled:opacity-50">
                {mutating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog open={!!cancelTarget} title="Cancel Order" message={`Cancel order #${cancelTarget?.orderNumber}? Stock will be restored.`} confirmLabel="Cancel Order" onConfirm={handleCancel} onCancel={() => setCancelTarget(null)} loading={mutating} />
    </DashboardLayout>
  );
}
