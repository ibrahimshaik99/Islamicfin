import { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { communityNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useMutation } from '../../lib/useApi';
import { LoadingState, ErrorState, Card, CardContent } from '../../components/ui';
import { useAdminList, DataTable, StatusBadge, Pagination, ConfirmDialog, SearchInput } from '../../components/admin/AdminComponents';

export default function MerchantsPage() {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [verifyTarget, setVerifyTarget] = useState<{ id: string; action: 'APPROVED' | 'REJECTED' } | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<{ id: string; name: string; action: 'SUSPENDED' | 'APPROVED' } | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const { mutate, loading: mutating } = useMutation();

  const { data, pagination, loading, error, refetch, setPage, setFilters, setSearch: setServerSearch } = useAdminList<Record<string, unknown>>({
    path: `${prefix}/merchants`,
    limit: 20,
    filters: statusFilter ? { status: statusFilter } : {},
  });

  const handleVerify = async () => {
    if (!verifyTarget) return;
    setActionError('');
    setActionSuccess('');
    const result = await mutate(`${prefix}/merchants/${verifyTarget.id}/verify`, { method: 'PATCH', body: { status: verifyTarget.action } });
    if (result !== null) {
      setActionSuccess(`Merchant ${verifyTarget.action === 'APPROVED' ? 'approved' : 'rejected'} successfully`);
      setVerifyTarget(null);
      refetch();
      setTimeout(() => setActionSuccess(''), 3000);
    } else {
      setActionError('Failed to update merchant status. You may not have permission.');
      setTimeout(() => setActionError(''), 5000);
    }
  };

  const handleSuspend = async () => {
    if (!suspendTarget) return;
    setActionError('');
    setActionSuccess('');
    const isReinstate = suspendTarget.action === 'APPROVED';
    const result = await mutate(`${prefix}/merchants/${suspendTarget.id}/suspend`, { method: 'PATCH', body: { status: suspendTarget.action, reason: isReinstate ? 'Reinstated by community admin' : 'Suspended by community admin' } });
    if (result !== null) {
      setActionSuccess(`Merchant "${suspendTarget.name}" ${isReinstate ? 'reinstated' : 'suspended'} successfully`);
      setSuspendTarget(null);
      refetch();
      setTimeout(() => setActionSuccess(''), 3000);
    } else {
      setActionError(`Failed to ${isReinstate ? 'reinstate' : 'suspend'} merchant. You may not have permission.`);
      setTimeout(() => setActionError(''), 5000);
    }
  };

  const handleSearch = (v: string) => { setSearch(v); setServerSearch(v); };

  const columns = [
    { key: 'businessName', label: 'Business Name' },
    { key: 'phone', label: 'Phone', render: (item: Record<string, unknown>) => <span className="text-sm text-gray-500">{String(item.phone || '-')}</span> },
    { key: 'verificationStatus', label: 'Status', render: (item: Record<string, unknown>) => <StatusBadge status={String(item.verificationStatus)} /> },
    { key: 'createdAt', label: 'Applied', render: (item: Record<string, unknown>) => (
      <span className="text-sm text-gray-500">{new Date(String(item.createdAt)).toLocaleDateString()}</span>
    )},
    { key: 'actions', label: '', render: (item: Record<string, unknown>) => (
      <div className="flex gap-2">
        {item.verificationStatus === 'PENDING' && (
          <>
            <button onClick={() => setVerifyTarget({ id: String(item.id), action: 'APPROVED' })} className="text-xs text-green-600 hover:text-green-700">Approve</button>
            <button onClick={() => setVerifyTarget({ id: String(item.id), action: 'REJECTED' })} className="text-xs text-red-600 hover:text-red-700">Reject</button>
          </>
        )}
        {item.verificationStatus === 'APPROVED' && (
          <button onClick={() => setSuspendTarget({ id: String(item.id), name: String(item.businessName), action: 'SUSPENDED' })} className="text-xs text-orange-600 hover:text-orange-700">Suspend</button>
        )}
        {item.verificationStatus === 'SUSPENDED' && (
          <button onClick={() => setSuspendTarget({ id: String(item.id), name: String(item.businessName), action: 'APPROVED' })} className="text-xs text-green-600 hover:text-green-700">Reinstate</button>
        )}
      </div>
    )},
  ];

  return (
    <DashboardLayout title="Merchants" navItems={communityNav} navTitle="Community">
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
            <h2 className="text-lg font-semibold text-gray-900">Community Merchants ({data.length})</h2>
            <div className="flex items-center gap-3">
              <SearchInput value={search} onChange={handleSearch} placeholder="Search merchants..." />
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setFilters(e.target.value ? { status: e.target.value } : {}); }}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2">
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
              <button onClick={() => refetch()} className="text-xs text-primary-600 hover:text-primary-700">Refresh</button>
            </div>
          </div>
          <Card>
            <CardContent>
              <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No merchants found" />
              {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
            </CardContent>
          </Card>
        </div>
      )}
      <ConfirmDialog open={!!verifyTarget} title={verifyTarget?.action === 'APPROVED' ? 'Approve Merchant' : 'Reject Merchant'} message={`${verifyTarget?.action?.toLowerCase()} this merchant?`} confirmLabel={verifyTarget?.action === 'APPROVED' ? 'Approve' : 'Reject'} onConfirm={handleVerify} onCancel={() => setVerifyTarget(null)} loading={mutating} />
      <ConfirmDialog open={!!suspendTarget} title={suspendTarget?.action === 'APPROVED' ? 'Reinstate Merchant' : 'Suspend Merchant'} message={suspendTarget?.action === 'APPROVED' ? `Reinstate "${suspendTarget?.name}"? They will be able to sell products again.` : `Suspend "${suspendTarget?.name}"? They won't be able to sell products.`} confirmLabel={suspendTarget?.action === 'APPROVED' ? 'Reinstate' : 'Suspend'} onConfirm={handleSuspend} onCancel={() => setSuspendTarget(null)} loading={mutating} />
    </DashboardLayout>
  );
}
