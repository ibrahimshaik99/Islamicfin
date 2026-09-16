import { useState, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { merchantNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../lib/useApi';
import { Button, Card, CardContent, LoadingState, ErrorState, OrderStatusBadge, PaymentStatusBadge } from '../../components/ui';
import { useAdminList, DataTable, Pagination, ConfirmDialog } from '../../components/admin/AdminComponents';

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
}

interface OrderDetail {
  id: string;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  total: string;
  shippingAddress: string;
  customerName: string;
  customerPhone: string;
  items: OrderItem[];
  createdAt: string;
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
        <p className="text-sm text-gray-500 mb-3">Please provide a reason for this rejection.</p>
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
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderDetailModal({ open, orderId, communityId, onClose }: {
  open: boolean;
  orderId: string | null;
  communityId: string;
  onClose: () => void;
}) {
  const { data: order, loading, error } = useApi<OrderDetail>(
    open && orderId ? `/communities/${communityId}/orders/${orderId}` : null
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {order ? `Order ${order.orderNumber}` : 'Order Details'}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading && <LoadingState />}
          {error && <ErrorState message={error} />}
          {order && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Status</p>
                  <OrderStatusBadge status={order.orderStatus} />
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Payment</p>
                  <PaymentStatusBadge status={order.paymentStatus} />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Customer</p>
                <p className="text-sm font-medium text-gray-900">{order.customerName || 'N/A'}</p>
                <p className="text-xs text-gray-500 mt-1">{order.customerPhone || ''}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Shipping Address</p>
                <p className="text-sm text-gray-700">{order.shippingAddress || 'No address provided'}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Order Items</p>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left py-2.5 px-4 font-medium text-gray-500 text-xs">Item</th>
                        <th className="text-center py-2.5 px-4 font-medium text-gray-500 text-xs">Qty</th>
                        <th className="text-right py-2.5 px-4 font-medium text-gray-500 text-xs">Price</th>
                        <th className="text-right py-2.5 px-4 font-medium text-gray-500 text-xs">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items?.map((item) => (
                        <tr key={item.id} className="border-t border-gray-100">
                          <td className="py-2.5 px-4 text-gray-900">{item.productName}</td>
                          <td className="py-2.5 px-4 text-center text-gray-600">{item.quantity}</td>
                          <td className="py-2.5 px-4 text-right text-gray-600">₹{item.unitPrice}</td>
                          <td className="py-2.5 px-4 text-right font-medium text-gray-900">₹{item.totalPrice}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200 bg-gray-50">
                        <td colSpan={3} className="py-2.5 px-4 font-semibold text-gray-900">Total</td>
                        <td className="py-2.5 px-4 text-right font-bold text-gray-900">₹{order.total}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Payment Method</p>
                  <p className="text-sm text-gray-700">{order.paymentMethod || 'N/A'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Order Date</p>
                  <p className="text-sm text-gray-700">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MerchantOrdersPage() {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [statusFilter, setStatusFilter] = useState('');
  const [actionTarget, setActionTarget] = useState<{ id: string; action: 'accept' | 'status'; status?: string } | null>(null);
  const [rejectionTarget, setRejectionTarget] = useState<string | null>(null);
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const { mutate, loading: mutating } = useMutation();
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const { data, pagination, loading, error, refetch, setPage, setFilters } = useAdminList<Record<string, unknown>>({
    path: `${prefix}/orders`,
    limit: 20,
    filters: statusFilter ? { status: statusFilter } : {},
  });



  const handleManualRefresh = useCallback(() => {
    refetch();
    setLastRefreshed(new Date());
  }, [refetch]);

  const handleAccept = async () => {
    if (!actionTarget) return;
    try {
      await mutate(`${prefix}/orders/${actionTarget.id}/accept`, { method: 'POST' });
      setActionTarget(null);
      setActionError(null);
      refetch();
    } catch {
      setActionError('Failed to accept order. Please try again.');
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!actionTarget) return;
    try {
      await mutate(`${prefix}/orders/${actionTarget.id}/status`, { method: 'PATCH', body: { status } });
      setActionTarget(null);
      setActionError(null);
      refetch();
    } catch {
      setActionError('Failed to update order status. Please try again.');
    }
  };

  const handleVerifyPayment = async (orderId: string) => {
    try {
      await mutate(`${prefix}/orders/${orderId}/payment/verify`, { method: 'POST' });
      setActionError(null);
      refetch();
    } catch {
      setActionError('Failed to verify payment. Please try again.');
    }
  };

  const handleRejectPayment = async (reason: string) => {
    if (!rejectionTarget) return;
    try {
      await mutate(`${prefix}/orders/${rejectionTarget}/payment/reject`, { method: 'POST', body: { reason } });
      setRejectionTarget(null);
      setActionError(null);
      refetch();
    } catch {
      setActionError('Failed to reject payment. Please try again.');
    }
  };

  const statusLabel = (s: string) => s.replace(/_/g, ' ');

  const columns = [
    {
      key: 'orderNumber',
      label: 'Order #',
      render: (item: Record<string, unknown>) => (
        <button onClick={() => setDetailOrderId(String(item.id))} className="text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline transition-colors">
          {String(item.orderNumber)}
        </button>
      ),
    },
    {
      key: 'customerId',
      label: 'Customer',
      render: (item: Record<string, unknown>) => (
        <span className="text-sm text-gray-600 font-mono">{String(item.customerId ?? '').slice(0, 8)}...</span>
      ),
    },
    {
      key: 'items',
      label: 'Items',
      render: (item: Record<string, unknown>) => {
        const count = Array.isArray(item.items) ? item.items.length : (item.itemCount != null ? Number(item.itemCount) : null);
        return <span className="text-sm text-gray-600">{count != null ? count : '—'}</span>;
      },
    },
    {
      key: 'total',
      label: 'Total',
      render: (item: Record<string, unknown>) => (
        <span className="text-sm font-semibold text-gray-900">₹{String(item.total)}</span>
      ),
    },
    {
      key: 'orderStatus',
      label: 'Status',
      render: (item: Record<string, unknown>) => (
        <OrderStatusBadge status={String(item.orderStatus)} />
      ),
    },
    {
      key: 'paymentStatus',
      label: 'Payment',
      render: (item: Record<string, unknown>) => (
        <PaymentStatusBadge status={String(item.paymentStatus)} />
      ),
    },
    {
      key: 'paymentMethod',
      label: 'Method',
      render: (item: Record<string, unknown>) => (
        <span className="text-sm text-gray-500">{String(item.paymentMethod ?? '-')}</span>
      ),
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
        <div className="flex items-center gap-1.5">
          {item.orderStatus === 'PENDING' && (
            <Button variant="primary" size="sm" onClick={() => setActionTarget({ id: String(item.id), action: 'accept' })}>
              Accept
            </Button>
          )}
          {item.orderStatus === 'CONFIRMED' && (
            <Button variant="secondary" size="sm" onClick={() => setActionTarget({ id: String(item.id), action: 'status', status: 'PROCESSING' })}>
              Process
            </Button>
          )}
          {item.orderStatus === 'PROCESSING' && (
            <Button variant="secondary" size="sm" onClick={() => setActionTarget({ id: String(item.id), action: 'status', status: 'READY' })}>
              Ready
            </Button>
          )}
          {item.orderStatus === 'READY' && (
            <Button variant="secondary" size="sm" onClick={() => setActionTarget({ id: String(item.id), action: 'status', status: 'OUT_FOR_DELIVERY' })}>
              Out for Delivery
            </Button>
          )}
          {item.orderStatus === 'OUT_FOR_DELIVERY' && (
            <Button variant="primary" size="sm" onClick={() => setActionTarget({ id: String(item.id), action: 'status', status: 'DELIVERED' })}>
              Delivered
            </Button>
          )}
          {item.paymentStatus === 'PAYMENT_REPORTED' && (
            <>
              <Button variant="primary" size="sm" onClick={() => handleVerifyPayment(String(item.id))}>
                Verify
              </Button>
              <Button variant="danger" size="sm" onClick={() => setRejectionTarget(String(item.id))}>
                Reject
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Orders" navItems={merchantNav} navTitle="Merchant">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
              <p className="text-sm text-gray-500 mt-0.5">Manage your incoming orders</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 hidden sm:block">Updated {lastRefreshed.toLocaleTimeString()}</span>
              <button
                onClick={handleManualRefresh}
                className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                title="Refresh"
              >
                ↻
              </button>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setFilters(e.target.value ? { status: e.target.value } : {});
                }}
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PROCESSING">Processing</option>
                <option value="READY">Ready</option>
                <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {actionError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {actionError}
              <button onClick={() => setActionError(null)} className="ml-auto text-red-500 hover:text-red-700">✕</button>
            </div>
          )}

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No orders found" />
              {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
            </CardContent>
          </Card>

          <ConfirmDialog
            open={actionTarget?.action === 'accept'}
            title="Accept Order"
            message="Are you sure you want to accept this order? This will move it to Confirmed status."
            confirmLabel="Accept Order"
            onConfirm={handleAccept}
            onCancel={() => setActionTarget(null)}
            loading={mutating}
          />

          {actionTarget?.action === 'status' && actionTarget.status && (
            <ConfirmDialog
              open={true}
              title={`Mark as ${statusLabel(actionTarget.status)}`}
              message={`Update this order's status to ${statusLabel(actionTarget.status)}?`}
              confirmLabel="Update Status"
              onConfirm={() => handleUpdateStatus(actionTarget.status!)}
              onCancel={() => setActionTarget(null)}
              loading={mutating}
            />
          )}

          <RejectionModal
            open={!!rejectionTarget}
            title="Reject Payment"
            onConfirm={handleRejectPayment}
            onCancel={() => setRejectionTarget(null)}
            loading={mutating}
          />

          <OrderDetailModal
            open={!!detailOrderId}
            orderId={detailOrderId}
            communityId={communityId || ''}
            onClose={() => setDetailOrderId(null)}
          />
        </div>
      )}
    </DashboardLayout>
  );
}
