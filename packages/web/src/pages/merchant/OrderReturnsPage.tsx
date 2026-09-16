import { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { merchantNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useMutation } from '../../lib/useApi';
import { LoadingState, ErrorState, Card, CardContent } from '../../components/ui';
import { useAdminList, DataTable, StatusBadge, Pagination, ConfirmDialog, SearchInput } from '../../components/admin/AdminComponents';

export default function OrderReturnsPage() {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; action: 'APPROVED' | 'REJECTED' } | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const { mutate, loading: mutating } = useMutation();

  const { data, pagination, loading, error, refetch, setPage, setFilters, setSearch: setServerSearch } = useAdminList<Record<string, unknown>>({
    path: `${prefix}/returns`,
    limit: 20,
    filters: statusFilter ? { status: statusFilter } : {},
  });

  const handleStatusChange = async () => {
    if (!confirmTarget) return;
    setActionError('');
    setActionSuccess('');
    const result = await mutate(`${prefix}/returns/${confirmTarget.id}/status`, {
      method: 'PATCH',
      body: { status: confirmTarget.action },
    });
    if (result !== null) {
      setActionSuccess(`Return ${confirmTarget.action === 'APPROVED' ? 'approved' : 'rejected'} successfully`);
      setConfirmTarget(null);
      refetch();
      setTimeout(() => setActionSuccess(''), 3000);
    } else {
      setActionError('Failed to update return status. You may not have permission.');
      setTimeout(() => setActionError(''), 5000);
    }
  };

  const handleSearch = (v: string) => {
    setSearch(v);
    setServerSearch(v);
  };

  const columns = [
    {
      key: 'orderNumber',
      label: 'Order Number',
      render: (item: Record<string, unknown>) => (
        <span className="text-sm font-semibold text-gray-900">{String(item.orderNumber)}</span>
      ),
    },
    {
      key: 'customerName',
      label: 'Customer',
      render: (item: Record<string, unknown>) => (
        <span className="text-sm text-gray-600">{String(item.customerName || '-')}</span>
      ),
    },
    {
      key: 'reason',
      label: 'Reason',
      render: (item: Record<string, unknown>) => (
        <span className="text-sm text-gray-600 max-w-[200px] truncate block" title={String(item.reason || '')}>
          {String(item.reason || '-')}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: Record<string, unknown>) => <StatusBadge status={String(item.status)} />,
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (item: Record<string, unknown>) => (
        <span className="text-sm text-gray-500">{new Date(String(item.createdAt)).toLocaleDateString()}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (item: Record<string, unknown>) => (
        <div className="flex gap-2">
          {item.status === 'PENDING' && (
            <>
              <button
                onClick={() => setConfirmTarget({ id: String(item.id), action: 'APPROVED' })}
                className="text-xs text-green-600 hover:text-green-700 font-medium"
              >
                Approve
              </button>
              <button
                onClick={() => setConfirmTarget({ id: String(item.id), action: 'REJECTED' })}
                className="text-xs text-red-600 hover:text-red-700 font-medium"
              >
                Reject
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Order Returns" navItems={merchantNav} navTitle="Merchant">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {actionSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{actionSuccess}</div>
          )}
          {actionError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{actionError}</div>
          )}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Return Requests ({data.length})</h2>
            <div className="flex items-center gap-3">
              <SearchInput value={search} onChange={handleSearch} placeholder="Search returns..." />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setFilters(e.target.value ? { status: e.target.value } : {});
                }}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="COMPLETED">Completed</option>
              </select>
              <button onClick={() => refetch()} className="text-xs text-primary-600 hover:text-primary-700">Refresh</button>
            </div>
          </div>
          <Card>
            <CardContent>
              <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No return requests found" />
              {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
            </CardContent>
          </Card>
        </div>
      )}
      <ConfirmDialog
        open={!!confirmTarget}
        title={confirmTarget?.action === 'APPROVED' ? 'Approve Return' : 'Reject Return'}
        message={`${confirmTarget?.action === 'APPROVED' ? 'Approve' : 'Reject'} this return request?`}
        confirmLabel={confirmTarget?.action === 'APPROVED' ? 'Approve' : 'Reject'}
        onConfirm={handleStatusChange}
        onCancel={() => setConfirmTarget(null)}
        loading={mutating}
      />
    </DashboardLayout>
  );
}
