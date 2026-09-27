import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../lib/useApi';
import { LoadingState, ErrorState } from '../../components/ui';
import type { Order, OrderItem, OrderStatus } from '../../lib/types';
import { BnplContract, BnplFrequency, BNPL_STATUS_COLORS, formatMoney, toDateInputDefault } from '../../lib/bnpl';

const TIMELINE_STEPS: { status: OrderStatus; label: string; icon: string }[] = [
  { status: 'PENDING', label: 'Order Placed', icon: '📋' },
  { status: 'CONFIRMED', label: 'Confirmed', icon: '✓' },
  { status: 'PROCESSING', label: 'Processing', icon: '⚙️' },
  { status: 'READY', label: 'Ready', icon: '📦' },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: '🚚' },
  { status: 'DELIVERED', label: 'Delivered', icon: '🏠' },
];

function getStatusIndex(status: OrderStatus): number {
  if (status === 'CANCELLED' || status === 'REJECTED') return -1;
  return TIMELINE_STEPS.findIndex((s) => s.status === status);
}

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const { mutate } = useMutation();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'CASH' | 'COD'>('UPI');
  const [paymentRef, setPaymentRef] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi<Order & { items: OrderItem[] }>(
    communityId && orderId ? `${prefix}/orders/${orderId}` : null,
  );

  // Existing deferred-payment contract for this order (if any)
  const { data: bnplContracts, refetch: refetchBnpl } = useApi<BnplContract[]>(
    communityId && orderId ? `${prefix}/bnpl/contracts?orderId=${orderId}&limit=1` : null,
  );
  const existingPlan = bnplContracts && bnplContracts.length > 0 ? bnplContracts[0] : null;

  const [showBnplModal, setShowBnplModal] = useState(false);
  const [bnplDown, setBnplDown] = useState('0');
  const [bnplCount, setBnplCount] = useState(3);
  const [bnplFrequency, setBnplFrequency] = useState<BnplFrequency>('MONTHLY');
  const [bnplFirstDue, setBnplFirstDue] = useState(toDateInputDefault(7));
  const [bnplSubmitting, setBnplSubmitting] = useState(false);
  const [bnplError, setBnplError] = useState('');

  const order = data;

  const flash = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000); };

  const handleCancel = async () => {
    if (!orderId) return;
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      setActionError(null);
      await mutate(`${prefix}/orders/${orderId}/cancel`, { method: 'POST' });
      flash('Order cancelled');
      refetch();
    } catch {
      setActionError('Failed to cancel order. Please try again.');
    }
  };

  const handleReportPayment = async () => {
    if (!orderId || !order || !paymentRef.trim()) return;
    setSubmittingPayment(true);
    try {
      await mutate(`${prefix}/orders/${orderId}/payment/report`, {
        method: 'POST',
        body: {
          referenceNumber: paymentRef.trim(),
          amount: order.total,
          paymentMethod,
          notes: paymentMethod === 'CASH' ? 'Cash payment reported' : paymentMethod === 'UPI' ? `UPI Ref: ${paymentRef.trim()}` : 'COD payment',
        },
      });
      setShowPaymentModal(false);
      setPaymentRef('');
      flash('Payment reported! Waiting for merchant verification.');
      refetch();
    } catch {
      // error handled by useMutation
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleRequestReturn = async () => {
    if (!orderId) return;
    try {
      setActionError(null);
      await mutate(`${prefix}/orders/${orderId}/return`, {
        method: 'POST',
        body: { reason: returnReason.trim() || undefined },
      });
      setShowReturnModal(false);
      setReturnReason('');
      flash('Return request submitted');
      refetch();
    } catch {
      setActionError('Failed to request return. Please try again.');
    }
  };

  const canReportPayment = order && order.paymentStatus === 'UNPAID' && order.orderStatus !== 'CANCELLED' && order.orderStatus !== 'REJECTED';
  const isPaid = order?.paymentStatus === 'PAYMENT_VERIFIED';
  const isReported = order?.paymentStatus === 'PAYMENT_REPORTED';
  const isRejected = order?.paymentStatus === 'PAYMENT_REJECTED';
  const canRequestPlan =
    order &&
    !existingPlan &&
    order.paymentStatus !== 'PAYMENT_VERIFIED' &&
    order.orderStatus !== 'CANCELLED' &&
    order.orderStatus !== 'REJECTED';

  const handleRequestPlan = async () => {
    if (!orderId) return;
    setBnplSubmitting(true);
    setBnplError('');
    try {
      const result = await mutate(`${prefix}/bnpl/contracts`, {
        method: 'POST',
        body: {
          orderId,
          downPayment: bnplDown.trim() || '0',
          installmentCount: bnplCount,
          installmentFrequency: bnplFrequency,
          firstDueDate: bnplFirstDue,
        },
      });
      if (result === null) {
        setBnplError('Could not request the plan. Please check your inputs and try again.');
        return;
      }
      setShowBnplModal(false);
      flash('Installment plan requested — awaiting community & Shariah review.');
      refetchBnpl();
    } finally {
      setBnplSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-700 via-slate-600 to-gray-700 text-white sticky top-0 z-30 safe-top animate-in fade-in">
        <div className="flex items-center h-12 px-4">
          <button onClick={() => navigate(-1)} className="touch-target -ml-2 flex items-center justify-center">
            <svg className="h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-sm font-bold ml-2">Order {order?.orderNumber || ''}</h1>
        </div>
      </div>

      {loading && <div className="p-8"><LoadingState /></div>}
      {error && <div className="p-4"><ErrorState message={error} /></div>}

      {actionError && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-600">{actionError}</p>
        </div>
      )}

      {successMsg && (
        <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 rounded-xl animate-in fade-in">
          <p className="text-sm text-green-600 font-medium">{successMsg}</p>
        </div>
      )}

      {order && (
        <div className="p-4 space-y-4 pb-8 max-w-lg mx-auto animate-in fade-in">
          {/* Status */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900">Order Status</h3>
              <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${
                order.orderStatus === 'DELIVERED' ? 'bg-green-50 text-green-700' :
                order.orderStatus === 'CANCELLED' || order.orderStatus === 'REJECTED' ? 'bg-red-50 text-red-700' :
                'bg-blue-50 text-blue-700'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  order.orderStatus === 'DELIVERED' ? 'bg-green-400' :
                  order.orderStatus === 'CANCELLED' ? 'bg-red-400' : 'bg-blue-400 animate-pulse'
                }`} />
                {order.orderStatus.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Timeline */}
            {order.orderStatus !== 'CANCELLED' && order.orderStatus !== 'REJECTED' ? (
              <div className="space-y-0">
                {TIMELINE_STEPS.map((step, i) => {
                  const currentIdx = getStatusIndex(order.orderStatus);
                  const isComplete = i <= currentIdx;
                  const isCurrent = i === currentIdx;
                  return (
                    <div key={step.status} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                          isComplete ? 'bg-primary-500 border-primary-500' : 'bg-white border-gray-300'
                        } ${isCurrent ? 'ring-4 ring-primary-100' : ''}`}>
                          {isComplete && !isCurrent && (
                            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="3" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </div>
                        {i < TIMELINE_STEPS.length - 1 && (
                          <div className={`w-0.5 h-8 ${isComplete ? 'bg-primary-400' : 'bg-gray-200'}`} />
                        )}
                      </div>
                      <div className="flex-1 -mt-0.5">
                        <span className={`text-xs font-semibold ${isComplete ? 'text-gray-900' : 'text-gray-400'}`}>
                          {step.icon} {step.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-sm font-medium text-red-600">This order has been {order.orderStatus.toLowerCase()}</p>
              </div>
            )}
          </div>

          {/* Payment Status */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 delay-100">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Payment</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{order.paymentMethod === 'COD' ? 'Cash on Delivery' : order.paymentMethod?.includes('UPI') ? 'UPI Payment' : order.paymentMethod || 'UPI'}</span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                isPaid ? 'bg-green-50 text-green-700' :
                isRejected ? 'bg-red-50 text-red-700' :
                isReported ? 'bg-amber-50 text-amber-700' :
                'bg-gray-50 text-gray-500'
              }`}>
                {isPaid ? '✓ Verified' : isRejected ? '✕ Rejected' : isReported ? '⏳ Reported' : 'Unpaid'}
              </span>
            </div>
            {isReported && (
              <div className="mt-3 bg-amber-50 rounded-xl p-3">
                <p className="text-xs text-amber-700 font-medium">Payment reported — waiting for merchant verification</p>
              </div>
            )}
            {isPaid && (
              <div className="mt-3 bg-green-50 rounded-xl p-3">
                <p className="text-xs text-green-700 font-medium">Payment verified by merchant</p>
              </div>
            )}
            {isRejected && (
              <div className="mt-3 bg-red-50 rounded-xl p-3">
                <p className="text-xs text-red-700 font-medium">Payment rejected — please contact merchant</p>
              </div>
            )}
            {canReportPayment && (
              <button onClick={() => setShowPaymentModal(true)} className="mt-3 w-full py-3 text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl hover:from-blue-600 hover:to-indigo-600 active:scale-[0.98] transition-all shadow-lg shadow-blue-200">
                Mark Payment (UPI / Cash)
              </button>
            )}
          </div>

          {/* Deferred Payment Plan (Shariah-reviewed) */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 delay-150">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">Deferred Payment Plan</h3>
              {existingPlan && (
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${BNPL_STATUS_COLORS[existingPlan.status] || 'bg-gray-100 text-gray-700'}`}>
                  {existingPlan.status.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            {!existingPlan && canRequestPlan && (
              <>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">
                  Split this order into fixed installments — a deferred sale at a fixed total price.
                  No interest, compounding, or late fees. The plan starts only after community & Shariah review.
                </p>
                <button
                  onClick={() => { setBnplError(''); setShowBnplModal(true); }}
                  className="w-full py-3 text-sm font-bold text-teal-700 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors"
                >
                  Request Installment Plan
                </button>
              </>
            )}
            {!existingPlan && !canRequestPlan && order.paymentStatus === 'PAYMENT_VERIFIED' && (
              <p className="text-xs text-gray-500">This order is already paid in full.</p>
            )}
            {existingPlan && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Plan</span>
                  <span className="font-medium text-gray-900">
                    {existingPlan.installmentCount} × {formatMoney(existingPlan.installmentAmount)} ({existingPlan.installmentFrequency.toLowerCase()})
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Shariah review</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    existingPlan.shariahReviewStatus === 'REVIEWED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {existingPlan.shariahReviewStatus.replace(/_/g, ' ')}
                  </span>
                </div>
                <button
                  onClick={() => navigate(`/app/bnpl/${existingPlan.id}`)}
                  className="w-full py-2.5 text-xs font-bold text-teal-700 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors"
                >
                  View Schedule & Payments →
                </button>
              </div>
            )}
          </div>

          {/* Items */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 delay-200">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Items</h3>
            {order.items && order.items.length > 0 ? (
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                    <span className="text-gray-700">{item.productName || 'Product'} × {item.quantity}</span>
                    <span className="font-bold text-gray-900">₹{item.total}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Order details loading...</p>
            )}
            <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium text-gray-900">₹{order.subtotal}</span>
              </div>
              {parseFloat(order.deliveryFee) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Delivery</span>
                  <span className="font-medium text-gray-900">₹{order.deliveryFee}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-100">
                <span className="text-gray-900">Total</span>
                <span className="text-primary-600">₹{order.total}</span>
              </div>
            </div>
          </div>

          {/* Shipping */}
          {order.shippingAddress && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 delay-300">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Shipping Address</h3>
              <p className="text-sm text-gray-600">{order.shippingAddress}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 animate-in fade-in delay-400">
            {(order.orderStatus === 'PENDING' || order.orderStatus === 'CONFIRMED') && (
              <button onClick={handleCancel} className="flex-1 py-3 text-sm font-bold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
                Cancel Order
              </button>
            )}
            {order.orderStatus === 'DELIVERED' && (
              <button onClick={() => setShowReturnModal(true)} className="flex-1 py-3 text-sm font-bold text-amber-600 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors">
                Request Return
              </button>
            )}
          </div>
        </div>
      )}

      {/* Payment Report Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setShowPaymentModal(false)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in slide-in-from-bottom-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Mark Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Select payment method and enter the reference number.
            </p>
            <div className="flex gap-2 mb-4">
              {(['UPI', 'CASH', 'COD'] as const).map((m) => (
                <button key={m} onClick={() => setPaymentMethod(m)}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${paymentMethod === m ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}`}>
                  {m === 'UPI' ? 'UPI' : m === 'CASH' ? 'Cash' : 'COD'}
                </button>
              ))}
            </div>
            {paymentMethod === 'UPI' && (
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="UPI Transaction ID (e.g. 1234567890)"
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none mb-2"
                autoFocus
              />
            )}
            {paymentMethod === 'CASH' && (
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="Receipt number or 'Cash paid'"
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none mb-2"
                autoFocus
              />
            )}
            {paymentMethod === 'COD' && (
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="Enter 'COD' or receipt number"
                className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none mb-2"
                autoFocus
              />
            )}
            {order && (
              <p className="text-xs text-gray-400 mb-4">Amount to pay: ₹{order.total}</p>
            )}
            <button
              onClick={handleReportPayment}
              disabled={!paymentRef.trim() || submittingPayment}
              className="w-full py-3 text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
            >
              {submittingPayment ? 'Submitting...' : 'Submit Payment'}
            </button>
          </div>
        </div>
      )}

      {/* Return Request Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setShowReturnModal(false)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in slide-in-from-bottom-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Request Return</h3>
              <button onClick={() => setShowReturnModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Tell us why you want to return this order.</p>
            <textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              rows={3}
              placeholder="Describe the issue with your order..."
              className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none mb-2"
              autoFocus
            />
            <button
              onClick={handleRequestReturn}
              className="w-full py-3 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 transition-colors"
            >
              Submit Return Request
            </button>
          </div>
        </div>
      )}
      {/* Installment Plan Request Modal */}
      {showBnplModal && order && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setShowBnplModal(false)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in slide-in-from-bottom-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900">Request Installment Plan</h3>
              <button onClick={() => setShowBnplModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3 mb-4">
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600">
                Order total: <span className="font-bold text-gray-900">₹{order.total}</span>
                {' · '}fixed price, no interest or late fees. Plan requires community & Shariah review before activation.
              </div>
              {bnplError && <p className="text-sm text-red-600">{bnplError}</p>}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Down Payment (₹)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={bnplDown}
                  onChange={(e) => setBnplDown(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Installments</label>
                  <select
                    value={bnplCount}
                    onChange={(e) => setBnplCount(Number(e.target.value))}
                    className="w-full px-3 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white"
                  >
                    {Array.from({ length: 23 }, (_, i) => i + 2).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Frequency</label>
                  <select
                    value={bnplFrequency}
                    onChange={(e) => setBnplFrequency(e.target.value as BnplFrequency)}
                    className="w-full px-3 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-white"
                  >
                    <option value="WEEKLY">Weekly</option>
                    <option value="BIWEEKLY">Every 2 weeks</option>
                    <option value="MONTHLY">Monthly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">First Due Date</label>
                <input
                  type="date"
                  value={bnplFirstDue}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setBnplFirstDue(e.target.value)}
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
            </div>
            <button
              onClick={handleRequestPlan}
              disabled={bnplSubmitting || !bnplFirstDue}
              className="w-full py-3 text-sm font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {bnplSubmitting ? 'Submitting...' : 'Request Plan for Review'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
