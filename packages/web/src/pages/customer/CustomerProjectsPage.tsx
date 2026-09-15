import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../lib/useApi';
import { LoadingState, ErrorState } from '../../components/ui';
import type { CrowdfundingProject } from '../../lib/types';

export default function CustomerProjectsPage() {
  const navigate = useNavigate();
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'DONATION' | 'INVESTMENT'>('ALL');
  const [contributeTarget, setContributeTarget] = useState<{ id: string; title: string; type: string } | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const { mutate, loading: mutating } = useMutation();

  const { data, loading, error, refetch } = useApi<CrowdfundingProject[]>(
    communityId ? `${prefix}/crowdfunding/projects` : null,
  );

  const projects = (data || []).filter(
    (p) => p.status === 'ACTIVE' &&
      (filter === 'ALL' || p.projectType === filter) &&
      (!search || p.title.toLowerCase().includes(search.toLowerCase()) || p.description?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleContribute = async () => {
    if (!contributeTarget || !amount || parseFloat(amount) <= 0) return;
    try {
      setActionError(null);
      await mutate(`${prefix}/crowdfunding/projects/${contributeTarget.id}/contributions`, {
        body: { amount, notes: notes.trim() || undefined },
      });
      setContributeTarget(null);
      setAmount('');
      setNotes('');
      refetch();
    } catch {
      setActionError('Failed to process contribution. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-purple-50/20">
      <div className="bg-gradient-to-br from-purple-600 via-indigo-500 to-blue-500 text-white sticky top-0 z-30 safe-top animate-in fade-in">
        <div className="flex items-center h-12 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="touch-target -ml-2 flex items-center justify-center">
            <svg className="h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-sm font-bold ml-2">Projects</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {actionError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{actionError}</p>
          </div>
        )}

        <div className="relative animate-in fade-in">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects..." className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white shadow-sm" />
        </div>

        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 animate-in fade-in delay-100">
          {(['ALL', 'DONATION', 'INVESTMENT'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`flex-shrink-0 px-4 py-2 text-xs font-bold rounded-full transition-all ${
              filter === f ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300'
            }`}>
              {f === 'ALL' ? 'All' : f === 'DONATION' ? 'Donations' : 'Investments'}
            </button>
          ))}
        </div>

        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {!loading && !error && projects.length === 0 && (
          <div className="text-center py-16 animate-in fade-in">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📋</span>
            </div>
            <p className="text-base font-semibold text-gray-700">No projects found</p>
          </div>
        )}

        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 delay-200">
          {projects.map((p, i) => {
            const raised = parseFloat(p.raisedAmount || '0');
            const goal = parseFloat(p.goalAmount || '1');
            const pct = goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0;
            const isInvestment = p.projectType === 'INVESTMENT';

            return (
              <div key={p.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">{p.title}</h3>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${isInvestment ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                    {p.projectType}
                  </span>
                </div>
                {p.description && <p className="text-xs text-gray-600 line-clamp-2 mb-3 leading-relaxed">{p.description}</p>}

                {/* Progress */}
                <div className="mb-4">
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-gray-500 font-medium">₹{raised.toLocaleString('en-IN')} raised</span>
                    <span className="text-xs text-primary-600 font-bold">{pct}%</span>
                  </div>
                </div>

                {p.endDate && (
                  <p className="text-[10px] text-gray-400 mb-3 flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                    Ends: {new Date(p.endDate).toLocaleDateString()}
                  </p>
                )}

                {/* Investment-specific info */}
                {isInvestment && (
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 mb-4 space-y-1.5">
                    {p.contractType && <p className="text-[10px] text-purple-700"><strong>Contract:</strong> {p.contractType.replace(/_/g, ' ')}</p>}
                    {p.expectedReturns && <p className="text-[10px] text-purple-700"><strong>Returns:</strong> {p.expectedReturns}</p>}
                    {p.riskDisclosure && <p className="text-[10px] text-red-600"><strong>Risk:</strong> {p.riskDisclosure}</p>}
                    {p.shariahReviewStatus && <p className="text-[10px] text-purple-700"><strong>Shariah:</strong> {p.shariahReviewStatus.replace(/_/g, ' ')}</p>}
                  </div>
                )}

                <button
                  onClick={() => setContributeTarget({ id: p.id, title: p.title, type: p.projectType })}
                  className={`w-full py-3 text-sm font-bold rounded-xl transition-all active:scale-[0.98] ${
                    isInvestment
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-200'
                      : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-200'
                  }`}
                >
                  {isInvestment ? 'Express Interest' : 'Donate'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dialog */}
      {contributeTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md sm:mx-4 p-6 animate-in slide-in-from-bottom-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {contributeTarget.type === 'INVESTMENT' ? 'Express Interest' : 'Donate'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">{contributeTarget.title}</p>

            {contributeTarget.type === 'INVESTMENT' && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-xs text-amber-700 leading-relaxed">
                  <strong>Important:</strong> Expressing interest does not guarantee allocation. Investment requires Shariah review, legal approval, and proper contract execution.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount (₹)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" min="1"
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes (optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional message"
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => { setContributeTarget(null); setAmount(''); setNotes(''); }} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
              <button onClick={handleContribute} disabled={!amount || parseFloat(amount) <= 0 || mutating} className={`px-5 py-2.5 text-sm font-bold text-white rounded-xl disabled:opacity-50 transition-all active:scale-95 ${
                contributeTarget.type === 'INVESTMENT' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-primary-600 hover:bg-primary-700'
              }`}>
                {mutating ? 'Processing...' : contributeTarget.type === 'INVESTMENT' ? 'Submit Interest' : 'Donate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
