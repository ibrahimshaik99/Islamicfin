import { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { communityNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../lib/useApi';
import { useAdminList, FilterSelect, Pagination, StatusBadge, DataTable } from '../../components/admin/AdminComponents';
import { LoadingState, ErrorState, Button } from '../../components/ui';
import {
  BnplContractDetail,
  INSTALLMENT_STATUS_COLORS,
  formatMoney,
} from '../../lib/bnpl';

interface ContractRow {
  id: string;
  orderId: string;
  status: string;
  shariahReviewStatus: string;
  totalSalePrice: string;
  downPayment: string;
  installmentAmount: string;
  installmentCount: number;
  installmentFrequency: string;
  firstDueDate: string;
  createdAt: string;
  reviewComments: string | null;
  installmentProgress?: {
    total: number;
    paid: number;
    paidAmount: string;
    nextDueDate: string | null;
    nextDueAmount: string | null;
  };
  [key: string]: unknown;
}

export default function CommunityBnplPage() {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';

  const [statusFilter, setStatusFilter] = useState('');
  const { data, pagination, loading, error, refetch, setPage } = useAdminList<ContractRow>({
    path: `${prefix}/bnpl/contracts`,
    filters: statusFilter ? { status: statusFilter } : {},
    limit: 20,
  });

  const { mutate, loading: mutating, error: mutateError, resetError } = useMutation();

  // Detail modal (schedule + verify)
  const [detailId, setDetailId] = useState<string | null>(null);
  const { data: detail, loading: detailLoading, error: detailError, refetch: refetchDetail } = useApi<BnplContractDetail>(
    detailId ? `${prefix}/bnpl/contracts/${detailId}` : null,
  );

  // Review modal
  const [reviewTarget, setReviewTarget] = useState<ContractRow | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewShariah, setReviewShariah] = useState<'PENDING_REVIEW' | 'REVIEWED' | 'NEEDS_REVISION'>('REVIEWED');
  const [reviewComments, setReviewComments] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [flash, setFlash] = useState('');

  const flashMsg = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(''), 4000); };

  const handleReview = async () => {
    if (!reviewTarget) return;
    setReviewError('');
    resetError();
    const result = await mutate(`${prefix}/bnpl/contracts/${reviewTarget.id}/review`, {
      method: 'POST',
      body: {
        decision: reviewDecision,
        shariahReviewStatus: reviewDecision === 'APPROVE' ? reviewShariah : undefined,
        comments: reviewComments.trim() || undefined,
      },
    });
    if (result === null) {
      setReviewError('Review could not be submitted. Please try again.');
      return;
    }
    const activated = reviewDecision === 'APPROVE' && reviewShariah === 'REVIEWED';
    setReviewTarget(null);
    setReviewComments('');
    flashMsg(activated ? 'Contract approved and activated (Shariah: REVIEWED).' : 'Review recorded.');
    refetch();
  };

  const handleVerify = async (installmentId: string) => {
    if (!detailId) return;
    resetError();
    const result = await mutate(`${prefix}/bnpl/contracts/${detailId}/installments/${installmentId}/verify`, {
      method: 'POST',
      body: {},
    });
    if (result === null) return;
    flashMsg('Payment verified.');
    refetchDetail();
    refetch();
  };

  const columns = [
    {
      key: 'order', label: 'Order',
      render: (item: ContractRow) => <span className="font-mono text-xs text-gray-500">{item.orderId.slice(0, 8)}…</span>,
    },
    {
      key: 'amounts', label: 'Plan',
      render: (item: ContractRow) => (
        <div className="text-sm">
          <span className="font-semibold text-gray-900">{formatMoney(item.totalSalePrice)}</span>
          <span className="text-gray-500 text-xs"> · {item.installmentCount}×{formatMoney(item.installmentAmount)} {item.installmentFrequency.toLowerCase()}</span>
        </div>
      ),
    },
    {
      key: 'progress', label: 'Progress',
      render: (item: ContractRow) => (
        <span className="text-xs text-gray-500">
          {item.installmentProgress ? `${item.installmentProgress.paid}/${item.installmentProgress.total} paid` : '—'}
        </span>
      ),
    },
    { key: 'status', label: 'Status', render: (item: ContractRow) => <StatusBadge status={item.status} /> },
    {
      key: 'shariah', label: 'Shariah',
      render: (item: ContractRow) => <StatusBadge status={item.shariahReviewStatus} />,
    },
    {
      key: 'actions', label: '', className: 'text-right',
      render: (item: ContractRow) => (
        <div className="flex items-center justify-end gap-2">
          {item.status === 'PENDING_REVIEW' && (
            <button
              onClick={() => { setReviewError(''); resetError(); setReviewDecision('APPROVE'); setReviewTarget(item); }}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded hover:bg-emerald-50"
            >
              Review
            </button>
          )}
          <button
            onClick={() => { resetError(); setDetailId(item.id); }}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 px-2 py-1 rounded hover:bg-primary-50"
          >
            Schedule
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Installment Plans" navItems={communityNav} navTitle="Community">
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Deferred Payment Contracts</h2>
          <p className="text-sm text-gray-500">
            Review Shariah status before activation. Contracts only become ACTIVE after Shariah status is REVIEWED.
            No interest, compounding, or late fees apply to these plans.
          </p>
        </div>

        {flash && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">{flash}</div>}
        {mutateError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{mutateError}</div>}

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-end">
          <FilterSelect label="" value={statusFilter} onChange={setStatusFilter} options={[
            { value: '', label: 'All Status' },
            { value: 'PENDING_REVIEW', label: 'Pending Review' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ]} />
        </div>

        <div className="bg-white rounded-2xl border border-slate-100">
          <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No installment contracts yet" onRetry={refetch} />
          {pagination && <div className="px-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>}
        </div>
      </div>

      {/* Review modal */}
      {reviewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setReviewTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Review Installment Plan</h3>
            <p className="text-sm text-gray-500 mb-4">
              {formatMoney(reviewTarget.totalSalePrice)} · {reviewTarget.installmentCount} installments
            </p>
            {reviewError && <p className="text-sm text-red-600 mb-3">{reviewError}</p>}
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setReviewDecision('APPROVE')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${reviewDecision === 'APPROVE' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  Approve
                </button>
                <button
                  onClick={() => setReviewDecision('REJECT')}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${reviewDecision === 'REJECT' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >
                  Reject
                </button>
              </div>
              {reviewDecision === 'APPROVE' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Shariah Review Status</label>
                  <select
                    value={reviewShariah}
                    onChange={(e) => setReviewShariah(e.target.value as typeof reviewShariah)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="REVIEWED">REVIEWED — activates the contract</option>
                    <option value="PENDING_REVIEW">PENDING_REVIEW — approve but keep inactive</option>
                    <option value="NEEDS_REVISION">NEEDS_REVISION — send back</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Only mark REVIEWED if this contract has been checked against the platform's Shariah
                    requirements for deferred sales. This is a community review — not a fatwa.
                  </p>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Comments (optional)</label>
                <textarea
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
                  placeholder="Review notes..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setReviewTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                Cancel
              </button>
              <Button onClick={handleReview} loading={mutating}>Submit Review</Button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule / verify modal */}
      {detailId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDetailId(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Payment Schedule</h3>
              <button onClick={() => setDetailId(null)} className="text-sm text-gray-500 hover:text-gray-700">Close</button>
            </div>
            {detailLoading && <LoadingState />}
            {detailError && <ErrorState message={detailError} onRetry={refetchDetail} />}
            {detail && (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between"><span className="text-gray-500">Total price</span><span className="font-semibold">{formatMoney(detail.totalSalePrice)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Down payment</span><span className="font-semibold">{formatMoney(detail.downPayment)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Per installment</span><span className="font-semibold">{formatMoney(detail.installmentAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Contract status</span><StatusBadge status={detail.status} /></div>
                  <div className="flex justify-between"><span className="text-gray-500">Shariah status</span><StatusBadge status={detail.shariahReviewStatus} /></div>
                </div>
                <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg">
                  {detail.installments.map((inst) => (
                    <div key={inst.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">#{inst.installmentNumber} · {formatMoney(inst.amount)}</p>
                        <p className="text-xs text-gray-500">Due {new Date(inst.dueDate).toLocaleDateString()}{inst.referenceNumber ? ` · Ref: ${inst.referenceNumber}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${INSTALLMENT_STATUS_COLORS[inst.status] || 'bg-gray-100 text-gray-700'}`}>
                          {inst.status}
                        </span>
                        {inst.status === 'PAID' && (
                          <button
                            onClick={() => handleVerify(inst.id)}
                            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 px-2 py-1 rounded hover:bg-emerald-50"
                          >
                            Verify
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
