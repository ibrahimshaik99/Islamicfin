import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../lib/useApi';
import { LoadingState, ErrorState } from '../../components/ui';
import type { CrowdfundingProject } from '../../lib/types';

const QUICK_AMOUNTS = ['100', '250', '500', '1000'];

export default function CustomerSadaqahPage() {
  const navigate = useNavigate();
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [search, setSearch] = useState('');
  const [contributeTarget, setContributeTarget] = useState<{ id: string; title: string } | null>(null);
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const { mutate, loading: mutating, error: mutateError } = useMutation();

  const { data, loading, error, refetch } = useApi<CrowdfundingProject[]>(
    communityId ? `${prefix}/crowdfunding/projects` : null,
  );

  const projects = (data || []).filter(
    (p) => p.projectType === 'DONATION' && p.status === 'ACTIVE' &&
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
      setActionError('Failed to process donation. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-rose-50/20">
      <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-red-500 text-white sticky top-0 z-30 safe-top animate-in fade-in">
        <div className="flex items-center h-12 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="touch-target -ml-2 flex items-center justify-center">
            <svg className="h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-sm font-bold ml-2">Sadaqah</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {actionError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{actionError}</p>
          </div>
        )}

        <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 rounded-2xl p-4 animate-in fade-in">
          <p className="text-xs text-rose-700 leading-relaxed">
            <strong>Sadaqah</strong> is voluntary charity given for the pleasure of Allah. It has no fixed amount or time — give what you can, when you can. Sadaqah is separate from Zakat, which is obligatory.
          </p>
        </div>

        <div className="relative animate-in fade-in delay-100">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search Sadaqah projects..." className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none bg-white shadow-sm" />
        </div>

        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {!loading && !error && projects.length === 0 && (
          <div className="text-center py-16 animate-in fade-in">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">❤️</span>
            </div>
            <p className="text-base font-semibold text-gray-700">No active Sadaqah projects</p>
            <p className="text-sm text-gray-400 mt-1">Check back later</p>
          </div>
        )}

        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 delay-200">
          {projects.map((p, i) => {
            const raised = parseFloat(p.raisedAmount || '0');
            const goal = parseFloat(p.goalAmount || '1');
            const pct = goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0;
            return (
              <div key={p.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all" style={{ animationDelay: `${i * 50}ms` }}>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">{p.title}</h3>
                  <span className="text-[10px] font-bold bg-rose-50 text-rose-600 px-2.5 py-1 rounded-full">SADAQAH</span>
                </div>
                {p.description && <p className="text-xs text-gray-600 line-clamp-2 mb-3 leading-relaxed">{p.description}</p>}
                <div className="mb-4">
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className="text-xs text-gray-500 font-medium">₹{raised.toLocaleString('en-IN')} raised</span>
                    <span className="text-xs text-rose-600 font-bold">{pct}%</span>
                  </div>
                </div>
                {p.endDate && (
                  <p className="text-[10px] text-gray-400 mb-3">Ends: {new Date(p.endDate).toLocaleDateString()}</p>
                )}
                <button onClick={() => setContributeTarget({ id: p.id, title: p.title })} className="w-full py-3 text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl hover:from-rose-600 hover:to-pink-600 active:scale-[0.98] transition-all shadow-lg shadow-rose-200">
                  Donate Now
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Contribute Dialog */}
      {contributeTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md sm:mx-4 p-6 animate-in slide-in-from-bottom-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Donate to Sadaqah</h3>
            <p className="text-sm text-gray-500 mb-4">{contributeTarget.title}</p>

            {/* Quick Amount Buttons */}
            <div className="flex gap-2 mb-3">
              {QUICK_AMOUNTS.map((qa) => (
                <button key={qa} onClick={() => setAmount(qa)}
                  className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${amount === qa ? 'bg-rose-500 text-white shadow-sm' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`}>
                  ₹{qa}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount (₹)</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" min="1"
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes (optional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional dedication or message"
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none resize-none" />
              </div>
            </div>

            {mutateError && (
              <div className="mt-3 p-3 bg-red-50 rounded-xl">
                <p className="text-xs text-red-600">{mutateError}</p>
              </div>
            )}

            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => { setContributeTarget(null); setAmount(''); setNotes(''); }} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
              <button onClick={handleContribute} disabled={!amount || parseFloat(amount) <= 0 || mutating} className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-rose-500 to-pink-500 rounded-xl hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 active:scale-95 transition-all">
                {mutating ? 'Processing...' : 'Donate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
