import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../lib/useApi';
import { LoadingState, ErrorState } from '../../components/ui';
import {
  BnplContract,
  BNPL_STATUS_COLORS,
  formatMoney,
} from '../../lib/bnpl';

export default function BnplPage() {
  const navigate = useNavigate();
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';

  const { data, loading, error, refetch } = useApi<BnplContract[]>(
    communityId ? `${prefix}/bnpl/contracts?limit=50` : null,
  );

  const contracts = data || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-600 to-blue-700 text-white px-4 pt-6 pb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">My Installments</h1>
            <p className="text-teal-100 text-sm mt-1">Deferred payment plans — no interest, no late fees</p>
          </div>
          <button
            onClick={refetch}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg"
            title="Refresh"
          >
            ↻
          </button>
        </div>
      </div>

      <div className="px-4 -mt-4 space-y-3">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!loading && !error && contracts.length === 0 && (
          <div className="text-center py-16 animate-in fade-in">
            <div className="w-16 h-16 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-700">No installment plans</p>
            <p className="text-sm text-gray-500 mt-1">
              You can request a deferred payment plan from any order's detail page.
            </p>
            <button
              onClick={() => navigate('/app/orders')}
              className="mt-4 px-6 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700"
            >
              View My Orders
            </button>
          </div>
        )}

        {!loading && !error && contracts.map((contract, i) => {
          const progress = contract.installmentProgress;
          const pct = progress && progress.total > 0
            ? Math.round((progress.paid / progress.total) * 100)
            : 0;
          return (
            <button
              key={contract.id}
              onClick={() => navigate(`/app/bnpl/${contract.id}`)}
              className="w-full text-left bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${BNPL_STATUS_COLORS[contract.status] || 'bg-gray-100 text-gray-700'}`}>
                  {contract.status.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-gray-400">
                  {contract.installmentCount} × {contract.installmentFrequency.toLowerCase()}
                </span>
              </div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{formatMoney(contract.totalSalePrice)}</p>
                  <p className="text-xs text-gray-500">
                    {progress ? `${progress.paid} of ${progress.total} paid` : `${contract.installmentCount} installments`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{formatMoney(contract.installmentAmount)}</p>
                  <p className="text-xs text-gray-500">per installment</p>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all ${contract.status === 'COMPLETED' ? 'bg-blue-500' : 'bg-teal-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {contract.status === 'ACTIVE' && progress?.nextDueDate && (
                <p className="text-xs text-gray-500">
                  Next due: <span className="font-medium text-gray-700">{new Date(progress.nextDueDate).toLocaleDateString()}</span>
                  {' · '}
                  {formatMoney(progress.nextDueAmount)}
                </p>
              )}
              {contract.status === 'PENDING_REVIEW' && (
                <p className="text-xs text-amber-600">Awaiting community & Shariah review — not yet active.</p>
              )}
              {contract.status === 'COMPLETED' && (
                <p className="text-xs text-blue-600">All installments paid. JazakAllah khair.</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
