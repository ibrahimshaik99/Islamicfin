import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../lib/useApi';
import { LoadingState, ErrorState } from '../../components/ui';
import type { Order } from '../../lib/types';

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-400' },
  CONFIRMED: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-400' },
  PROCESSING: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-400' },
  READY: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-400' },
  OUT_FOR_DELIVERY: { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-400' },
  DELIVERED: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-400' },
  CANCELLED: { bg: 'bg-gray-50', text: 'text-gray-500', dot: 'bg-gray-400' },
  REJECTED: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-400' },
};

const PAYMENT_COLORS: Record<string, { bg: string; text: string }> = {
  UNPAID: { bg: 'bg-gray-50', text: 'text-gray-500' },
  PAYMENT_REPORTED: { bg: 'bg-amber-50', text: 'text-amber-700' },
  PAYMENT_VERIFIED: { bg: 'bg-green-50', text: 'text-green-700' },
  PAYMENT_REJECTED: { bg: 'bg-red-50', text: 'text-red-700' },
};

export default function OrdersPage() {
  const navigate = useNavigate();
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';

  const { data, loading, error, refetch } = useApi<Order[]>(
    communityId ? `${prefix}/orders` : null,
  );

  const orders = data || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/20">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-700 via-slate-600 to-gray-700 text-white sticky top-0 z-30 safe-top animate-in fade-in">
        <div className="flex items-center h-12 px-4">
          <button onClick={() => navigate(-1)} className="touch-target -ml-2 flex items-center justify-center">
            <svg className="h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-sm font-bold ml-2">My Orders</h1>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => refetch()} className="touch-target flex items-center justify-center">
              <svg className="h-4 w-4 text-white/70" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
            </button>
            <span className="text-[10px] text-white/50">{orders.length} orders</span>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {!loading && !error && orders.length === 0 && (
          <div className="text-center py-16 animate-in fade-in">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-gray-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📦</span>
            </div>
            <p className="text-base font-semibold text-gray-700">No orders yet</p>
            <p className="text-sm text-gray-400 mt-1">Your orders will appear here</p>
            <button onClick={() => navigate('/app/marketplace')} className="mt-4 px-6 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-colors">
              Browse Marketplace
            </button>
          </div>
        )}
        {!loading && !error && (
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
            {orders.map((order, i) => {
              const status = STATUS_COLORS[order.orderStatus] || STATUS_COLORS.PENDING;
              const payment = PAYMENT_COLORS[order.paymentStatus] || PAYMENT_COLORS.UNPAID;
              return (
                <Link
                  key={order.id}
                  to={`/app/orders/${order.id}`}
                  className="block bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all group"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">#{order.orderNumber}</p>
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">₹{order.total}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${status.bg} ${status.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                      {order.orderStatus.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${payment.bg} ${payment.text}`}>
                      {order.paymentStatus.replace(/_/g, ' ')}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
