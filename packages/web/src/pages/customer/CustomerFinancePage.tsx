import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../lib/useApi';
import { LoadingState, ErrorState } from '../../components/ui';
import { api } from '../../lib/api';
import type { FinanceContract, FinanceContractDetail, FinanceContractType } from '../../lib/types';

const CONTRACT_INFO: Record<FinanceContractType, { name: string; desc: string; gradient: string; icon: string }> = {
  QARD_HASAN: { name: 'Qard Hasan', desc: 'Interest-free loan. Borrower repays the principal only.', gradient: 'from-emerald-400 to-teal-500', icon: '💚' },
  MUDARABAH: { name: 'Mudarabah', desc: 'Profit-sharing partnership. Capital provider and entrepreneur share profits per agreed ratio.', gradient: 'from-blue-400 to-indigo-500', icon: '🤝' },
  MUSHARAKAH: { name: 'Musharakah', desc: 'Joint venture partnership. All parties contribute capital and share profits and losses.', gradient: 'from-purple-400 to-violet-500', icon: '🏢' },
  MURABAHAH: { name: 'Murabahah', desc: 'Cost-plus sale. Seller discloses cost and adds agreed markup. Buyer pays in installments.', gradient: 'from-orange-400 to-amber-500', icon: '🏷️' },
  IJARAH: { name: 'Ijarah', desc: 'Lease contract. Asset is leased for a specified period with agreed rental payments.', gradient: 'from-cyan-400 to-sky-500', icon: '🏠' },
};

export default function CustomerFinancePage() {
  const navigate = useNavigate();
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<FinanceContractDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [interestAmount, setInterestAmount] = useState('');
  const [interestNotes, setInterestNotes] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, loading, error } = useApi<FinanceContract[]>(
    communityId ? `${prefix}/finance/contracts` : null,
  );

  const { mutate, loading: mutating } = useMutation();

  const contracts = data || [];
  const grouped = contracts.reduce((acc, c) => {
    if (!acc[c.contractType]) acc[c.contractType] = [];
    acc[c.contractType].push(c);
    return acc;
  }, {} as Record<string, FinanceContract[]>);

  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    try {
      const res = await api<{ data: FinanceContractDetail }>(`${prefix}/finance/contracts/${id}`);
      const unwrapped = (res && typeof res === 'object' && 'data' in res && !(res instanceof Array))
        ? (res as unknown as { data: FinanceContractDetail }).data
        : res as unknown as FinanceContractDetail;
      setDetail(unwrapped);
      setSelectedId(id);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Failed to load contract');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
  };

  const handleExpressInterest = async () => {
    if (!detail) return;
    try {
      setActionError(null);
      await mutate(`${prefix}/finance/contracts/${detail.id}/interest`, {
        body: { amount: interestAmount || undefined, notes: interestNotes.trim() || undefined },
      });
      setShowInterestModal(false);
      setInterestAmount('');
      setInterestNotes('');
      loadDetail(detail.id);
    } catch {
      setActionError('Failed to express interest. Please try again.');
    }
  };

  if (selectedId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50/20">
        <div className="bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-500 text-white sticky top-0 z-30 safe-top animate-in fade-in">
          <div className="flex items-center h-12 px-4 max-w-lg mx-auto">
            <button onClick={closeDetail} className="touch-target -ml-2 flex items-center justify-center">
              <svg className="h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <h1 className="text-sm font-bold ml-2">Contract Details</h1>
            <button onClick={() => navigate('/app/messages')} className="ml-auto touch-target flex items-center justify-center">
              <svg className="h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">
          {detailLoading && <LoadingState />}
          {detailError && <ErrorState message={detailError} />}

          {actionError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-sm text-red-600">{actionError}</p>
            </div>
          )}
          {detail && (
            <div className="animate-in fade-in space-y-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <h2 className="text-lg font-bold text-gray-900">{detail.title}</h2>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r ${CONTRACT_INFO[detail.contractType]?.gradient || 'from-gray-400 to-gray-500'} text-white`}>
                    {CONTRACT_INFO[detail.contractType]?.name || detail.contractType}
                  </span>
                </div>
                {detail.description && <p className="text-sm text-gray-600 mb-3">{detail.description}</p>}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3">
                    <p className="text-[10px] text-gray-500 font-medium">Principal Amount</p>
                    <p className="text-xl font-bold text-gray-900">₹{detail.principalAmount}</p>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3">
                    <p className="text-[10px] text-gray-500 font-medium">Currency</p>
                    <p className="text-xl font-bold text-gray-900">{detail.currency}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <InfoRow label="Contract Type" value={(detail.contractType || '').replace(/_/g, ' ')} />
                  <InfoRow label="Status" value={(detail.status || '').replace(/_/g, ' ')} />
                  <InfoRow label="Shariah Review" value={(detail.shariahReviewStatus || '').replace(/_/g, ' ')} />
                  <InfoRow label="Legal Status" value={(detail.legalStatus || '').replace(/_/g, ' ')} />
                  <InfoRow label="Execution Approved" value={detail.executionApproved === 'YES' ? 'Yes' : 'No'} />
                  {detail.startDate && <InfoRow label="Start Date" value={new Date(detail.startDate).toLocaleDateString()} />}
                  {detail.endDate && <InfoRow label="End Date" value={new Date(detail.endDate).toLocaleDateString()} />}
                </div>
              </div>

              {/* Express Interest Button */}
              {detail.status === 'ACTIVE' && (
                <button onClick={() => setShowInterestModal(true)}
                  className="w-full py-3 text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl hover:from-violet-600 hover:to-purple-600 active:scale-[0.98] transition-all shadow-lg shadow-violet-200">
                  Express Interest in This Contract
                </button>
              )}

              {CONTRACT_INFO[detail.contractType] && (
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-2xl p-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-1">About {CONTRACT_INFO[detail.contractType].name}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{CONTRACT_INFO[detail.contractType].desc}</p>
                </div>
              )}

              {detail.participants && detail.participants.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Parties</h3>
                  <div className="space-y-2">
                    {detail.participants.map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{p.userId}</p>
                          <p className="text-[10px] text-gray-500">{p.participantRole}</p>
                        </div>
                        {p.contributionAmount && <span className="text-sm font-bold text-gray-900">₹{p.contributionAmount}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.transactions && detail.transactions.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Transactions</h3>
                  <div className="space-y-2">
                    {detail.transactions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                        <div>
                          <p className="text-sm font-bold text-gray-900">₹{t.amount}</p>
                          <p className="text-[10px] text-gray-500">{t.transactionType} {t.paymentMethod ? `· ${t.paymentMethod}` : ''}</p>
                          <p className="text-[10px] text-gray-400">{new Date(t.createdAt).toLocaleString()}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${t.status === 'VERIFIED' ? 'bg-green-50 text-green-700' : t.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'}`}>{t.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.repaymentSummary && (
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Repayment Summary</h3>
                  <div className="space-y-2">
                    <InfoRow label="Principal" value={`₹${detail.repaymentSummary.principalAmount}`} />
                    <InfoRow label="Total Repaid" value={`₹${detail.repaymentSummary.totalRepaid}`} />
                    <InfoRow label="Remaining" value={`₹${detail.repaymentSummary.remainingBalance}`} />
                    <InfoRow label="Payments Made" value={String(detail.repaymentSummary.repaymentCount)} />
                  </div>
                </div>
              )}

              {detail.documents && detail.documents.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Documents</h3>
                  <div className="space-y-2">
                    {detail.documents.map((d) => (
                      <a key={d.id} href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0 text-primary-600 hover:text-primary-700">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                        <span className="text-xs font-medium">{d.documentType}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {detail.reviews && detail.reviews.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                  <h3 className="text-sm font-bold text-gray-900 mb-3">Shariah Reviews</h3>
                  <div className="space-y-2">
                    {detail.reviews.map((r) => (
                      <div key={r.id} className="py-2 border-b border-gray-50 last:border-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">{r.reviewer}</p>
                           <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${r.status === 'REVIEWED' || r.status === 'APPROVED' ? 'bg-green-50 text-green-700' : r.status === 'NEEDS_REVISION' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'}`}>{(r.status || '').replace(/_/g, ' ')}</span>
                        </div>
                        {r.comments && <p className="text-xs text-gray-600 mt-1">{r.comments}</p>}
                        <p className="text-[10px] text-gray-400 mt-0.5">{new Date(r.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <p className="text-xs text-amber-700 leading-relaxed">
                  <strong>Disclaimer:</strong> This information is provided for educational and transparency purposes. Islamic finance contracts are governed by specific Shariah principles and legal requirements. Consult qualified scholars and legal advisors before entering into any financial contract.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Express Interest Modal */}
        {showInterestModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md sm:mx-4 p-6 animate-in slide-in-from-bottom-4">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Express Interest</h3>
              <p className="text-sm text-gray-500 mb-4">This is not a commitment to invest. It expresses your interest for discussion.</p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-xs text-amber-700 leading-relaxed">
                  <strong>Important:</strong> Expressing interest does not guarantee allocation. Investment requires Shariah review, legal approval, and proper contract execution.
                </p>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount (₹)</label>
                  <input type="number" value={interestAmount} onChange={(e) => setInterestAmount(e.target.value)} placeholder="Optional amount"
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes (optional)</label>
                  <textarea value={interestNotes} onChange={(e) => setInterestNotes(e.target.value)} rows={2} placeholder="Any questions or message..."
                    className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 outline-none resize-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-5">
                <button onClick={() => { setShowInterestModal(false); setInterestAmount(''); setInterestNotes(''); }} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
                <button onClick={handleExpressInterest} disabled={mutating}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl hover:from-violet-600 hover:to-purple-600 disabled:opacity-50 active:scale-95 transition-all">
                  {mutating ? 'Submitting...' : 'Submit Interest'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-violet-50/20">
      <div className="bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-500 text-white sticky top-0 z-30 safe-top animate-in fade-in">
        <div className="flex items-center h-12 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="touch-target -ml-2 flex items-center justify-center">
            <svg className="h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-sm font-bold ml-2">Islamic Finance</h1>
        </div>
      </div>

        <div className="max-w-lg mx-auto p-4 space-y-4 pb-8">
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-2xl p-4 animate-in fade-in">
          <p className="text-xs text-violet-700 leading-relaxed">
            <strong>Islamic Finance</strong> follows Shariah principles. Contracts are distinct financial arrangements — not conventional loans or interest-based products. Each contract type has specific rules for parties, contributions, risk-sharing, and obligations.
          </p>
        </div>

        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {!loading && !error && contracts.length === 0 && (
          <div className="text-center py-16 animate-in fade-in">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">🏦</span>
            </div>
            <p className="text-base font-semibold text-gray-700">No finance contracts available</p>
          </div>
        )}

        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 delay-100">
          {(Object.keys(grouped) as FinanceContractType[]).map((type) => (
            <div key={type}>
              <div className="flex items-center gap-2 mb-2.5">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full bg-gradient-to-r ${CONTRACT_INFO[type]?.gradient || 'from-gray-400 to-gray-500'} text-white`}>
                  {CONTRACT_INFO[type]?.icon} {CONTRACT_INFO[type]?.name || type}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">{grouped[type].length} contract{grouped[type].length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {grouped[type].map((c) => (
                  <button key={c.id} onClick={() => loadDetail(c.id)} className="w-full text-left bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all active:scale-[0.98]">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-bold text-gray-900">{c.title}</h3>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${c.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : c.status === 'COMPLETED' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-600'}`}>{c.status}</span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">₹{c.principalAmount}</p>
                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                      <span>Shariah: {(c.shariahReviewStatus || '').replace(/_/g, ' ')}</span>
                      <span>Legal: {(c.legalStatus || '').replace(/_/g, ' ')}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900 capitalize">{value}</span>
    </div>
  );
}
