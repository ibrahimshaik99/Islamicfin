import { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { merchantNav } from '../../lib/navigation';
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
  installmentAmount: string;
  installmentCount: number;
  installmentFrequency: string;
  createdAt: string;
  installmentProgress?: {
    total: number;
    paid: number;
    paidAmount: string;
    nextDueDate: string | null;
    nextDueAmount: string | null;
  };
  [key: string]: unknown;
}

export default function MerchantBnplPage() {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';

  const [statusFilter, setStatusFilter] = useState('');
  const { data, pagination, loading, error, refetch, setPage } = useAdminList<ContractRow>({
    path: `${prefix}/bnpl/contracts`,
    filters: statusFilter ? { status: statusFilter } : {},
    limit: 20,
  });

  const { mutate, loading: mutating, error: mutateError, resetError } = useMutation();

  const [detailId, setDetailId] = useState<string | null>(null);
  const { data: detail, loading: detailLoading, error: detailError, refetch: refetchDetail } = useApi<BnplContractDetail>(
    detailId ? `${prefix}/bnpl/contracts/${detailId}` : null,
  );

  const [payTarget, setPayTarget] = useState<{ id: string; amount: string; number: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER'>('CASH');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [flash, setFlash] = useState('');

  const flashMsg = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(''), 4000); };

  const handlePay = async () => {
    if (!payTarget || !detailId) return;
    resetError();
    const result = await mutate(`${prefix}/bnpl/contracts/${detailId}/installments/${payTarget.id}/pay`, {
      method: 'POST',
      body: { paymentMethod, referenceNumber: referenceNumber.trim() || undefined },
    });
    if (result === null) return;
    setPayTarget(null);
    setReferenceNumber('');
    flashMsg('Payment recorded — awaiting community verification.');
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
          {item.installmentProgress
            ? `${item.installmentProgress.paid}/${item.installmentProgress.total} paid${item.installmentProgress.nextDueDate ? ` · next ${new Date(item.installmentProgress.nextDueDate).toLocaleDateString()}` : ''}`
            : '—'}
        </span>
      ),
    },
    { key: 'status', label: 'Status', render: (item: ContractRow) => <StatusBadge status={item.status} /> },
    {
      key: 'actions', label: '', className: 'text-right',
      render: (item: ContractRow) => (
        <button
          onClick={() => { resetError(); setDetailId(item.id); }}
          className="text-xs font-medium text-primary-600 hover:text-primary-700 px-2 py-1 rounded hover:bg-primary-50"
        >
          Schedule
        </button>
      ),
    },
  ];

  return (
    <DashboardLayout title="Installment Plans" navItems={merchantNav} navTitle="Merchant">
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Deferred Payment Contracts</h2>
          <p className="text-sm text-gray-500">
            Contracts for your store's orders. You can record installment payments received in person;
            the community verifies them.
          </p>
        </div>

        {flash && <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">{flash}</div>}
        {mutateError && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{mutateError}</div>}

        <div className="flex justify-end">
          <FilterSelect label="" value={statusFilter} onChange={setStatusFilter} options={[
            { value: '', label: 'All Status' },
            { value: 'PENDING_REVIEW', label: 'Pending Review' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'COMPLETED', label: 'Completed' },
            { value: 'CANCELLED', label: 'Cancelled' },
          ]} />
        </div>

        <div className="bg-white rounded-2xl border border-slate-100">
          <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No installment contracts for your store yet" onRetry={refetch} />
          {pagination && <div className="px-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>}
        </div>
      </div>

      {/* Schedule + pay modal */}
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
                  <div className="flex justify-between"><span className="text-gray-500">Status</span><StatusBadge status={detail.status} /></div>
                </div>
                <div className="divide-y divide-gray-50 border border-gray-100 rounded-lg">
                  {detail.installments.map((inst) => (
                    <div key={inst.id} className="px-3 py-2.5 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">#{inst.installmentNumber} · {formatMoney(inst.amount)}</p>
                        <p className="text-xs text-gray-500">Due {new Date(inst.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${INSTALLMENT_STATUS_COLORS[inst.status] || 'bg-gray-100 text-gray-700'}`}>
                          {inst.status}
                        </span>
                        {detail.status === 'ACTIVE' && inst.status === 'PENDING' && (
                          <button
                            onClick={() => { resetError(); setPayTarget({ id: inst.id, amount: inst.amount, number: inst.installmentNumber }); }}
                            className="text-xs font-medium text-teal-600 hover:text-teal-700 px-2 py-1 rounded hover:bg-teal-50"
                          >
                            Record Payment
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

      {/* Record payment modal */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPayTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Record Payment — #{payTarget.number}</h3>
            <p className="text-sm text-gray-500 mb-4">{formatMoney(payTarget.amount)}</p>
            {mutateError && <p className="text-sm text-red-600 mb-3">{mutateError}</p>}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Reference / Receipt No. (optional)</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setPayTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                Cancel
              </button>
              <Button onClick={handlePay} loading={mutating}>Record Payment</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
