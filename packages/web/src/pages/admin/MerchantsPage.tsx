import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { adminNav } from '../../lib/navigation';
import { api } from '../../lib/api';
import { useAdminList, useAdminDetail, SearchInput, FilterSelect, Pagination, StatusBadge, DataTable, ConfirmDialog } from '../../components/admin/AdminComponents';
import { LoadingState, ErrorState, Card, CardContent, Button } from '../../components/ui';

/* ───── Merchant Detail ───── */

export function MerchantDetail() {
  const { merchantId } = useParams<{ merchantId: string }>();
  const { data, loading, error, refetch } = useAdminDetail<{ id: string; communityId: string; userId: string; businessName: string; description: string | null; phone: string | null; verificationStatus: string; createdAt: string }>({ path: `/admin/merchants/${merchantId}` });
  const [actionLoading, setActionLoading] = useState(false);
  const [confirm, setConfirm] = useState<'approve' | 'reject' | 'suspend' | null>(null);

  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(true);
    try {
      await api(`/admin/merchants/${merchantId}/status`, { method: 'POST', body: { status: newStatus } });
      refetch();
    } catch { /* handled */ } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  };

  if (loading) return <DashboardLayout title="Merchant" navItems={adminNav} navTitle="Admin"><LoadingState /></DashboardLayout>;
  if (error || !data) return <DashboardLayout title="Merchant" navItems={adminNav} navTitle="Admin"><ErrorState message={error || 'Not found'} onRetry={refetch} /></DashboardLayout>;

  return (
    <DashboardLayout title={data.businessName} navItems={adminNav} navTitle="Admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">{data.businessName}</h2>
              <StatusBadge status={data.verificationStatus} />
            </div>
          </div>
          <div className="flex gap-2">
            {data.verificationStatus === 'PENDING' && (
              <>
                <Button variant="primary" size="sm" onClick={() => setConfirm('approve')}>Approve</Button>
                <Button variant="danger" size="sm" onClick={() => setConfirm('reject')}>Reject</Button>
              </>
            )}
            {data.verificationStatus === 'APPROVED' && (
              <Button variant="danger" size="sm" onClick={() => setConfirm('suspend')}>Suspend</Button>
            )}
            {(data.verificationStatus === 'REJECTED' || data.verificationStatus === 'SUSPENDED') && (
              <Button variant="primary" size="sm" onClick={() => setConfirm('approve')}>Approve</Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Business Details</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Business Name</dt><dd className="text-gray-900">{data.businessName}</dd></div>
                {data.description && <div className="flex justify-between"><dt className="text-gray-500">Description</dt><dd className="text-gray-900 text-right max-w-[200px] truncate">{data.description}</dd></div>}
                {data.phone && <div className="flex justify-between"><dt className="text-gray-500">Phone</dt><dd className="text-gray-900">{data.phone}</dd></div>}
                <div className="flex justify-between"><dt className="text-gray-500">Created</dt><dd className="text-gray-900">{new Date(data.createdAt).toLocaleDateString()}</dd></div>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Verification</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd><StatusBadge status={data.verificationStatus} /></dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Community</dt><dd className="text-gray-900">{data.communityId.slice(0, 8)}...</dd></div>
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'approve' ? 'Approve Merchant' : confirm === 'reject' ? 'Reject Merchant' : 'Suspend Merchant'}
        message={confirm === 'approve' ? `Approve "${data.businessName}"? They can start selling.` : confirm === 'reject' ? `Reject "${data.businessName}"?` : `Suspend "${data.businessName}"? They will lose selling access.`}
        confirmLabel={confirm === 'approve' ? 'Approve' : confirm === 'reject' ? 'Reject' : 'Suspend'}
        loading={actionLoading}
        onConfirm={() => handleStatusChange(confirm === 'approve' ? 'APPROVED' : confirm === 'reject' ? 'REJECTED' : 'SUSPENDED')}
        onCancel={() => setConfirm(null)}
      />
    </DashboardLayout>
  );
}

/* ───── Merchants List ───── */

export default function MerchantsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { data, pagination, loading, error, refetch, setPage } = useAdminList<{ id: string; communityId: string; userId: string; businessName: string; description: string | null; phone: string | null; verificationStatus: string; createdAt: string; orderCount: number }>({
    path: '/admin/merchants',
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
    {
      key: 'businessName', label: 'Merchant',
      render: (item: { id: string; businessName: string; description: string | null; phone: string | null }) => (
        <div>
          <span className="font-medium text-gray-900">{item.businessName}</span>
          {item.description && <p className="text-xs text-gray-500 truncate max-w-[200px]">{item.description}</p>}
          {item.phone && <p className="text-xs text-gray-400">{item.phone}</p>}
        </div>
      ),
    },
    { key: 'communityId', label: 'Community', render: (item: { communityId: string }) => <span className="text-gray-500 text-xs">{item.communityId.slice(0, 8)}...</span> },
    { key: 'orderCount', label: 'Orders', render: (item: { orderCount: number }) => <span className="font-medium text-gray-900">{item.orderCount}</span> },
    { key: 'verificationStatus', label: 'Status', render: (item: { verificationStatus: string }) => <StatusBadge status={item.verificationStatus} /> },
    { key: 'createdAt', label: 'Created', render: (item: { createdAt: string }) => new Date(item.createdAt).toLocaleDateString() },
  ];

  return (
    <DashboardLayout title="Merchants" navItems={adminNav} navTitle="Admin">
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search merchants..." /></div>
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
              { value: 'APPROVED', label: 'Approved' },
              { value: 'REJECTED', label: 'Rejected' },
              { value: 'SUSPENDED', label: 'Suspended' },
            ]} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100">
          <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No merchants found" onRetry={refetch} />
          {pagination && <div className="px-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>}
        </div>
      </div>
    </DashboardLayout>
  );
}
