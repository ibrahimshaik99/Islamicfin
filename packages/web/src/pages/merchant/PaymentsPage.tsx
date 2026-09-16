import { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { merchantNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useMutation } from '../../lib/useApi';
import { LoadingState, ErrorState } from '../../components/ui';
import { useAdminList, Pagination } from '../../components/admin/AdminComponents';

interface OrderRecord extends Record<string, unknown> {
  id: string;
  orderNumber: string;
  customerId: string;
  total: string;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  shippingAddress?: string;
}

function RejectionModal({ open, title, onConfirm, onCancel, loading }: {
  open: boolean;
  title: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState('');
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        <p className="text-sm text-gray-500 mb-3">Provide a reason for rejecting this payment.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter rejection reason..."
          rows={4}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none transition-colors"
        />
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onCancel} disabled={loading} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { if (reason.trim()) onConfirm(reason.trim()); }}
            disabled={loading || !reason.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
          >
            {loading && <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Reject Payment
          </button>
        </div>
      </div>
    </div>
  );
}

const PAYMENT_STATUS_CONFIG: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  UNPAID: { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400', label: 'Unpaid' },
  PAYMENT_REPORTED: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400', label: 'Reported' },
  PAYMENT_VERIFIED: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-400', label: 'Verified' },
  PAYMENT_REJECTED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400', label: 'Rejected' },
};

const METHOD_ICONS: Record<string, string> = {
  UPI: '📱',
  CASH: '💵',
  COD: '📦',
};

export default function PaymentsPage() {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [statusFilter, setStatusFilter] = useState('');
  const [rejectionTarget, setRejectionTarget] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { mutate, loading: mutating } = useMutation();

  const { data, pagination, loading, error, refetch, setPage, setFilters } = useAdminList<OrderRecord>({
    path: `${prefix}/orders`,
    limit: 20,
    filters: statusFilter ? { paymentStatus: statusFilter } : {},
  });



  const flashSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleVerify = async (orderId: string) => {
    try {
      await mutate(`${prefix}/orders/${orderId}/payment/verify`, { method: 'POST' });
      setActionError(null);
      flashSuccess('Payment verified successfully');
      refetch();
    } catch {
      setActionError('Failed to verify payment. Please try again.');
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectionTarget) return;
    try {
      await mutate(`${prefix}/orders/${rejectionTarget}/payment/reject`, { method: 'POST', body: { reason } });
      setRejectionTarget(null);
      setActionError(null);
      flashSuccess('Payment rejected');
      refetch();
    } catch {
      setActionError('Failed to reject payment. Please try again.');
    }
  };

  const orders = data || [];
  const reportedOrders = orders.filter((o) => o.paymentStatus === 'PAYMENT_REPORTED');
  const verifiedOrders = orders.filter((o) => o.paymentStatus === 'PAYMENT_VERIFIED');
  const allOrders = statusFilter ? orders : orders;

  return (
    <DashboardLayout title="Payments" navItems={merchantNav} navTitle="Merchant">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Payment Verification</h2>
              <p className="text-sm text-gray-500 mt-0.5">Review and verify customer UPI/Cash payments</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => refetch()} className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors" title="Refresh">
                ↻
              </button>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setFilters(e.target.value ? { paymentStatus: e.target.value } : {}); }}
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
              >
                <option value="">All Statuses</option>
                <option value="PAYMENT_REPORTED">⏳ Reported ({reportedOrders.length})</option>
                <option value="PAYMENT_VERIFIED">✓ Verified ({verifiedOrders.length})</option>
                <option value="PAYMENT_REJECTED">✕ Rejected</option>
                <option value="UNPAID">Unpaid</option>
              </select>
            </div>
          </div>

          {successMessage && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {successMessage}
            </div>
          )}

          {actionError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {actionError}
              <button onClick={() => setActionError(null)} className="ml-auto text-red-500 hover:text-red-700">✕</button>
            </div>
          )}

          {!statusFilter && reportedOrders.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-amber-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                Pending Verification ({reportedOrders.length})
              </h3>
              <div className="space-y-3">
                {reportedOrders.map((order) => {
                  const statusCfg = PAYMENT_STATUS_CONFIG[order.paymentStatus] || PAYMENT_STATUS_CONFIG.UNPAID;
                  const methodIcon = METHOD_ICONS[order.paymentMethod] || '💳';
                  return (
                    <div key={order.id} className="bg-white rounded-2xl p-4 border border-amber-200 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-lg">
                            {methodIcon}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">#{order.orderNumber}</p>
                            <p className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">₹{order.total}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
                            {statusCfg.label}
                          </span>
                        </div>
                      </div>
                      <div className="bg-amber-50 rounded-xl p-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-700">{order.paymentMethod || 'UPI'}</span>
                          <span className="text-xs text-amber-600">Payment reported by customer</span>
                        </div>
                        <p className="text-[10px] text-amber-500 mt-1">Customer has marked this as paid. Please verify the payment.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleVerify(order.id)}
                          className="flex-1 py-2.5 text-xs font-bold text-white bg-green-600 rounded-xl hover:bg-green-700 active:scale-[0.98] transition-all"
                        >
                          ✓ Verify Payment
                        </button>
                        <button
                          onClick={() => setRejectionTarget(order.id)}
                          className="flex-1 py-2.5 text-xs font-bold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 active:scale-[0.98] transition-all"
                        >
                          ✕ Reject
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3">
              {statusFilter ? `Filtered: ${statusFilter.replace(/_/g, ' ')}` : 'All Orders'}
            </h3>
            <div className="space-y-3">
              {allOrders.map((order) => {
                const statusCfg = PAYMENT_STATUS_CONFIG[order.paymentStatus] || PAYMENT_STATUS_CONFIG.UNPAID;
                const methodIcon = METHOD_ICONS[order.paymentMethod] || '💳';
                return (
                  <div key={order.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg">
                          {methodIcon}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">#{order.orderNumber}</p>
                          <p className="text-[10px] text-gray-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">₹{order.total}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusCfg.bg} ${statusCfg.text}`}>
                          {order.paymentMethod || 'UPI'} · {statusCfg.label}
                        </span>
                      </div>
                    </div>
                    {order.paymentStatus === 'PAYMENT_REPORTED' && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                        <button onClick={() => handleVerify(order.id)} className="flex-1 py-2 text-[11px] font-bold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors">
                          ✓ Verify
                        </button>
                        <button onClick={() => setRejectionTarget(order.id)} className="flex-1 py-2 text-[11px] font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                          ✕ Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {allOrders.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No orders found.</p>}
            </div>
          </div>

          {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}

          <RejectionModal
            open={!!rejectionTarget}
            title="Reject Payment"
            onConfirm={handleReject}
            onCancel={() => setRejectionTarget(null)}
            loading={mutating}
          />
        </div>
      )}
    </DashboardLayout>
  );
}
