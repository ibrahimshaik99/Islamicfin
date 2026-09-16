import { useState, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { adminNav } from '../../lib/navigation';
import { api } from '../../lib/api';
import { useAdminList, FilterSelect, Pagination, StatusBadge, DataTable, ConfirmDialog } from '../../components/admin/AdminComponents';
import { StatCard, Card, CardContent } from '../../components/ui';
import type { ShariahReview } from '../../lib/types';

export default function ShariahPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const { data, pagination, loading, error, refetch, setPage } = useAdminList<ShariahReview>({
    path: '/admin/shariah/reviews',
    filters: statusFilter ? { status: statusFilter } : {},
  });

  const pendingCount = data.filter((r) => r.status === 'PENDING_REVIEW').length;
  const reviewedCount = data.filter((r) => r.status === 'REVIEWED').length;
  const needsRevisionCount = data.filter((r) => r.status === 'NEEDS_REVISION').length;

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: 'REVIEWED' | 'NEEDS_REVISION' | 'ARCHIVED'; label: string } | null>(null);
  const [showComments, setShowComments] = useState<ShariahReview | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const handleManualRefresh = useCallback(() => {
    refetch();
    setLastRefreshed(new Date());
  }, [refetch]);

  const handleStatusUpdate = async (reviewId: string, status: string) => {
    setActionLoading(reviewId);
    try {
      await api(`/admin/shariah/reviews/${reviewId}`, {
        method: 'PATCH',
        body: { status },
      });
      refetch();
    } catch { /* handled */ } finally {
      setActionLoading(null);
      setConfirmAction(null);
    }
  };

  const columns = [
    {
      key: 'contractId', label: 'Contract',
      render: (item: ShariahReview) => (
        <span className="text-xs text-gray-500 font-mono">{item.contractId.slice(0, 8)}...</span>
      ),
    },
    { key: 'reviewer', label: 'Reviewer', render: (item: ShariahReview) => <span className="text-gray-900">{item.reviewer}</span> },
    { key: 'status', label: 'Status', render: (item: ShariahReview) => <StatusBadge status={item.status} /> },
    { key: 'version', label: 'Version', render: (item: ShariahReview) => <span className="text-gray-500">v{item.version}</span> },
    {
      key: 'comments', label: 'Comments',
      render: (item: ShariahReview) => item.comments
        ? <button onClick={() => setShowComments(item)} className="text-primary-600 hover:text-primary-700 text-xs truncate max-w-[120px] block">{item.comments.slice(0, 30)}...</button>
        : <span className="text-gray-300">-</span>,
    },
    {
      key: 'reviewedAt', label: 'Reviewed At',
      render: (item: ShariahReview) => item.reviewedAt
        ? <span className="text-gray-500 text-xs">{new Date(item.reviewedAt).toLocaleDateString()}</span>
        : <span className="text-gray-300">-</span>,
    },
    {
      key: 'actions', label: '', className: 'text-right',
      render: (item: ShariahReview) => (
        <div className="flex items-center justify-end gap-1">
          {item.status === 'PENDING_REVIEW' && (
            <>
              <button
                onClick={() => setConfirmAction({ id: item.id, action: 'REVIEWED', label: 'Approve' })}
                disabled={actionLoading === item.id}
                className="text-xs font-medium text-green-600 hover:text-green-700 disabled:opacity-50 px-2 py-1 rounded hover:bg-green-50 transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => setConfirmAction({ id: item.id, action: 'NEEDS_REVISION', label: 'Request Revision' })}
                disabled={actionLoading === item.id}
                className="text-xs font-medium text-orange-600 hover:text-orange-700 disabled:opacity-50 px-2 py-1 rounded hover:bg-orange-50 transition-colors"
              >
                Revise
              </button>
            </>
          )}
          {item.status === 'NEEDS_REVISION' && (
            <button
              onClick={() => setConfirmAction({ id: item.id, action: 'REVIEWED', label: 'Approve' })}
              disabled={actionLoading === item.id}
              className="text-xs font-medium text-green-600 hover:text-green-700 disabled:opacity-50 px-2 py-1 rounded hover:bg-green-50 transition-colors"
            >
              Approve
            </button>
          )}
          {(item.status === 'REVIEWED' || item.status === 'NEEDS_REVISION') && (
            <button
              onClick={() => setConfirmAction({ id: item.id, action: 'ARCHIVED', label: 'Archive' })}
              disabled={actionLoading === item.id}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
            >
              Archive
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Shariah Governance" navItems={adminNav} navTitle="Admin">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Pending Reviews" value={pendingCount} className="bg-yellow-50 border-yellow-100" />
          <StatCard label="Reviewed" value={reviewedCount} className="bg-green-50 border-green-100" />
          <StatCard label="Needs Revision" value={needsRevisionCount} className="bg-orange-50 border-orange-100" />
        </div>

        <div className="flex justify-end gap-2">
          <span className="text-xs text-gray-400 hidden sm:block self-center">Updated {lastRefreshed.toLocaleTimeString()}</span>
          <button
            onClick={handleManualRefresh}
            className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            ↻
          </button>
          <FilterSelect label="" value={statusFilter} onChange={setStatusFilter} options={[
            { value: '', label: 'All Status' },
            { value: 'PENDING_REVIEW', label: 'Pending Review' },
            { value: 'REVIEWED', label: 'Reviewed' },
            { value: 'NEEDS_REVISION', label: 'Needs Revision' },
            { value: 'ARCHIVED', label: 'Archived' },
          ]} />
        </div>

        <Card>
          <CardContent>
            <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No reviews found" onRetry={refetch} />
            {pagination && <div className="mt-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.label ?? 'Update Review'}
        message={`Are you sure you want to mark this review as "${confirmAction?.action?.replace(/_/g, ' ').toLowerCase()}"?`}
        confirmLabel={confirmAction?.label ?? 'Confirm'}
        loading={actionLoading !== null}
        onConfirm={() => confirmAction && handleStatusUpdate(confirmAction.id, confirmAction.action)}
        onCancel={() => setConfirmAction(null)}
      />

      {showComments && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowComments(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Review Comments</h3>
            <p className="text-sm text-gray-600 mb-1">Reviewer: {showComments.reviewer}</p>
            <p className="text-sm text-gray-600 mb-4">Version: v{showComments.version}</p>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">{showComments.comments}</div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowComments(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Close</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
