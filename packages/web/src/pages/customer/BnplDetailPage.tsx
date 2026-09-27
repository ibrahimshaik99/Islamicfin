import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../lib/useApi';
import { LoadingState, ErrorState, Button } from '../../components/ui';
import {
  BnplContractDetail,
  BNPL_STATUS_COLORS,
  INSTALLMENT_STATUS_COLORS,
  formatMoney,
} from '../../lib/bnpl';

export default function BnplDetailPage() {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';

  const { data, loading, error, refetch } = useApi<BnplContractDetail>(
    communityId && contractId ? `${prefix}/bnpl/contracts/${contractId}` : null,
  );
  const { mutate, loading: mutating, error: mutateError, resetError } = useMutation();

  const [payTarget, setPayTarget] = useState<{ id: string; amount: string; number: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER'>('UPI');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [flash, setFlash] = useState('');
  const [payError, setPayError] = useState('');

  const handlePay = async () => {
    if (!payTarget) return;
    resetError();
    setPayError('');
    const result = await mutate(
      `${prefix}/bnpl/contracts/${contractId}/installments/${payTarget.id}/pay`,
      {
        method: 'POST',
        body: {
          paymentMethod,
          referenceNumber: referenceNumber.trim() || undefined,
        },
      },
    );
    if (result !== null) {
      setPayTarget(null);
      setReferenceNumber('');
      setFlash('Payment reported. The community will verify it.');
      setTimeout(() => setFlash(''), 4000);
      refetch();
    } else {
      setPayError('Could not report payment. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-8"><LoadingState /></div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-4">
          <button onClick={() => navigate(-1)} className="text-sm text-gray-600 mb-4">← Back</button>
          <ErrorState message={error || 'Contract not found'} onRetry={refetch} />
        </div>
      </div>
    );
  }

  const contract = data;
  const progress = {
    paid: contract.installments.filter((i) => i.status === 'PAID' || i.status === 'VERIFIED').length,
    total: contract.installments.length,
  };
  const canPay = contract.status === 'ACTIVE';

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 to-blue-700 text-white px-4 pt-6 pb-8">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg">←</button>
          <div>
            <h1 className="text-lg font-bold">Installment Plan</h1>
            <p className="text-teal-100 text-xs">
              {contract.order ? `Order ${contract.order.orderNumber}` : 'Deferred payment'}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-4">
        {flash && (
          <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">{flash}</div>
        )}
        {mutateError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{mutateError}</div>
        )}
        {payError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{payError}</div>
        )}

        {/* Summary */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${BNPL_STATUS_COLORS[contract.status] || 'bg-gray-100 text-gray-700'}`}>
              {contract.status.replace(/_/g, ' ')}
            </span>
            <span className="text-xs text-gray-500">{progress.paid}/{progress.total} paid</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-gray-500">Order total</p>
              <p className="font-semibold text-gray-900">{formatMoney(contract.totalSalePrice)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Down payment</p>
              <p className="font-semibold text-gray-900">{formatMoney(contract.downPayment)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Per installment</p>
              <p className="font-semibold text-gray-900">{formatMoney(contract.installmentAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Schedule</p>
              <p className="font-semibold text-gray-900">
                {contract.installmentCount} × {contract.installmentFrequency.toLowerCase()}
              </p>
            </div>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-teal-500 rounded-full"
              style={{ width: `${progress.total > 0 ? Math.round((progress.paid / progress.total) * 100) : 0}%` }}
            />
          </div>
        </div>

        {/* Shariah / review note */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm text-sm">
          <p className="text-xs font-semibold text-gray-900 mb-1">Contract terms</p>
          <p className="text-gray-600 text-xs leading-relaxed">{contract.contractTerms}</p>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
            <span className="text-xs text-gray-500">Shariah review</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              contract.shariahReviewStatus === 'REVIEWED' ? 'bg-emerald-100 text-emerald-700' :
              contract.shariahReviewStatus === 'NEEDS_REVISION' ? 'bg-orange-100 text-orange-700' :
              'bg-amber-100 text-amber-700'
            }`}>
              {contract.shariahReviewStatus.replace(/_/g, ' ')}
            </span>
          </div>
          {contract.reviewComments && (
            <p className="text-xs text-gray-500 mt-2 italic">“{contract.reviewComments}”</p>
          )}
        </div>

        {contract.status === 'PENDING_REVIEW' && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
            This plan is pending community and Shariah review. It becomes active only after review —
            no payments are due until then.
          </div>
        )}

        {/* Schedule */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Payment Schedule</p>
          </div>
          <div className="divide-y divide-gray-50">
            {contract.installments.map((inst) => (
              <div key={inst.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    #{inst.installmentNumber} · {formatMoney(inst.amount)}
                  </p>
                  <p className="text-xs text-gray-500">Due {new Date(inst.dueDate).toLocaleDateString()}</p>
                  {inst.referenceNumber && (
                    <p className="text-xs text-gray-400">Ref: {inst.referenceNumber}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${INSTALLMENT_STATUS_COLORS[inst.status] || 'bg-gray-100 text-gray-700'}`}>
                    {inst.status}
                  </span>
                  {canPay && inst.status === 'PENDING' && (
                    <button
                      onClick={() => { resetError(); setPayTarget({ id: inst.id, amount: inst.amount, number: inst.installmentNumber }); }}
                      className="text-xs font-medium text-teal-600 hover:text-teal-700 px-2 py-1 rounded hover:bg-teal-50"
                    >
                      Pay
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pay modal */}
      {payTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setPayTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Report Payment — Installment #{payTarget.number}
            </h3>
            <p className="text-sm text-gray-500 mb-4">{formatMoney(payTarget.amount)}</p>
            {payError && <p className="text-sm text-red-600 mb-3">{payError}</p>}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
                >
                  <option value="UPI">UPI</option>
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Reference Number (optional)</label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="UPI txn id / receipt no."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <p className="text-xs text-gray-500">
                Your payment will be verified by the community finance team. Reporting a payment is a record —
                the platform does not process money.
              </p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setPayTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
                Cancel
              </button>
              <Button onClick={handlePay} loading={mutating}>Report Payment</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
