import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../lib/useApi';
import { LoadingState, ErrorState } from '../../components/ui';
import type { KametiReport, KametiContribution } from '../../lib/types';

export default function CustomerKametiDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { communityId, user } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [tab, setTab] = useState<'overview' | 'members' | 'periods' | 'contributions' | 'payouts'>('periods');
  const [showMarkPayment, setShowMarkPayment] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'COD'>('UPI');
  const [paymentRef, setPaymentRef] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [joining, setJoining] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, loading, error, refetch } = useApi<KametiReport>(
    communityId && groupId ? `${prefix}/kameti/groups/${groupId}/report` : null,
  );

  const { mutate, loading: mutating } = useMutation<{ data: { conversationId?: string } }>();

  const report = data;
  const isMember = report?.members.some((m) => m.userId === user?.id && m.status === 'ACTIVE');
  const myMember = report?.members.find((m) => m.userId === user?.id);

  const handleJoin = async () => {
    if (!groupId) return;
    setJoining(true);
    try {
      const res = await mutate(`${prefix}/kameti/groups/${groupId}/join`, { method: 'POST' });
      refetch();
      if (res?.data?.conversationId) {
        navigate(`/app/messages?conversationId=${res.data.conversationId}`);
      }
    } finally {
      setJoining(false);
    }
  };

  const handleMarkPayment = async (contributionId: string) => {
    try {
      setActionError(null);
      await mutate(`${prefix}/kameti/contributions/${contributionId}/pay`, {
        body: {
          paymentMethod,
          referenceNumber: paymentRef.trim() || undefined,
        },
      });
      setShowMarkPayment(null);
      setPaymentRef('');
      setPaymentAmount('');
      refetch();
    } catch {
      setActionError('Failed to mark payment. Please try again.');
    }
  };

  const getContributionsForPeriod = (periodId: string) => {
    return (report?.contributions || []).filter((c) => c.periodId === periodId);
  };

  const getMemberContributionForPeriod = (memberId: string, periodId: string): KametiContribution | undefined => {
    return report?.contributions.find((c) => c.memberId === memberId && c.periodId === periodId);
  };

  const getPayoutForPeriod = (periodId: string) => {
    return report?.payouts.find((p) => p.periodId === periodId);
  };

  const getMemberName = (memberId: string) => {
    const member = report?.members.find((m) => m.id === memberId);
    return member?.name || member?.email || 'Unknown';
  };

  const totalPeriods = report?.summary.totalPeriods || 0;
  const completedPeriods = report?.summary.completedPeriods || 0;
  const periodsLeft = totalPeriods - completedPeriods;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/20">
      <div className="bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-500 text-white sticky top-0 z-30 safe-top animate-in fade-in">
        <div className="flex items-center h-12 px-4 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="touch-target -ml-2 flex items-center justify-center">
            <svg className="h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-sm font-bold ml-2">Kameti</h1>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => refetch()} className="touch-target flex items-center justify-center">
              <svg className="h-4 w-4 text-white/70" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
            </button>
            {isMember && (
              <button onClick={() => navigate('/app/messages')} className="touch-target flex items-center justify-center">
                <svg className="h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {loading && <div className="p-8"><LoadingState /></div>}
      {error && <div className="p-4"><ErrorState message={error} onRetry={refetch} /></div>}

      {actionError && (
        <div className="max-w-lg mx-auto px-4 mt-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-red-600">{actionError}</p>
          </div>
        </div>
      )}

      {report && (
        <div className="max-w-lg mx-auto p-4 space-y-4 animate-in fade-in">
          {/* Header Card */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">{report.group.name}</h2>
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                report.group.status === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'
              }`}>
                {report.group.status === 'ACTIVE' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                {report.group.status}
              </span>
            </div>
            {report.group.description && <p className="text-sm text-gray-600 mb-3">{report.group.description}</p>}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-blue-600 font-medium mb-1">Contribution Amount</p>
              <p className="text-2xl font-bold text-blue-700">₹{report.group.contributionAmount}</p>
              <p className="text-xs text-blue-500">{report.group.frequency} · {report.summary.activeMembers} active members · {periodsLeft > 0 ? `${periodsLeft} periods left` : 'Completed'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3">
                <p className="text-[10px] text-green-600 font-medium">Total Collected</p>
                <p className="text-lg font-bold text-green-700">₹{report.summary.totalContributions}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3">
                <p className="text-[10px] text-blue-600 font-medium">Total Distributed</p>
                <p className="text-lg font-bold text-blue-700">₹{report.summary.totalPayouts}</p>
              </div>
            </div>

            {!isMember && report.group.status === 'ACTIVE' && (
              <button onClick={handleJoin} disabled={joining}
                className="w-full mt-4 py-3 text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 active:scale-[0.98] transition-all shadow-lg shadow-blue-200">
                {joining ? 'Joining...' : 'Join This Kameti'}
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
            {(['overview', 'members', 'periods', 'contributions', 'payouts'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all capitalize ${tab === t ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm' : 'text-gray-500'}`}>{t}</button>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-in fade-in">
              <div className="space-y-3">
                <Row label="Start Date" value={new Date(report.group.startDate).toLocaleDateString()} />
                {report.group.endDate && <Row label="End Date" value={new Date(report.group.endDate).toLocaleDateString()} />}
                <Row label="Total Members" value={String(report.summary.totalMembers)} />
                <Row label="Active Members" value={String(report.summary.activeMembers)} />
                <Row label="Completed Periods" value={`${report.summary.completedPeriods}/${report.summary.totalPeriods}`} />
                <Row label="Periods Left" value={String(periodsLeft)} />
                <Row label="Balance" value={`₹${report.summary.balance}`} />
              </div>
            </div>
          )}

          {tab === 'members' && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-in fade-in">
              {report.members.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No members yet.</p>
              ) : (
                <div className="space-y-2">
                  {report.members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-blue-600">{(m.name || m.email || '?')[0]}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{m.name || m.email}</p>
                          <p className="text-[10px] text-gray-400">Position #{m.position}</p>
                          {m.userId === user?.id && <p className="text-[10px] text-teal-500 font-medium">You</p>}
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        m.status === 'ACTIVE' ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'
                      }`}>{m.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'periods' && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-in fade-in">
              {report.periods.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No periods yet.</p>
              ) : (
                <div className="space-y-4">
                  {report.periods.map((p) => {
                    const periodContributions = getContributionsForPeriod(p.id);
                    const paidCount = periodContributions.filter((c) => c.status === 'VERIFIED' || c.status === 'PAID').length;
                    const isActive = p.status === 'ACTIVE';
                    const isCompleted = p.status === 'COMPLETED';
                    const payout = getPayoutForPeriod(p.id);
                    const myContrib = myMember ? getMemberContributionForPeriod(myMember.id, p.id) : undefined;

                    return (
                      <div key={p.id} className={`rounded-xl border overflow-hidden ${isActive ? 'border-blue-200 bg-blue-50/30' : isCompleted ? 'border-green-200 bg-green-50/30' : 'border-gray-100'}`}>
                        {/* Period Header */}
                        <div className="px-4 py-3 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-gray-900">Period {p.periodNumber}</p>
                            <p className="text-[10px] text-gray-400">{new Date(p.startDate).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                              isActive ? 'bg-blue-50 text-blue-600' : isCompleted ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500'
                            }`}>{p.status}</span>
                            <p className="text-[10px] text-gray-400 mt-1">{paidCount}/{report.summary.activeMembers} paid</p>
                          </div>
                        </div>

                        {/* Per-member breakdown */}
                        <div className="bg-white/60 border-t border-gray-100 px-4 py-3 space-y-2">
                          {report.members.filter((m) => m.status === 'ACTIVE').map((m) => {
                            const contrib = getMemberContributionForPeriod(m.id, p.id);
                            const isPaid = contrib && (contrib.status === 'VERIFIED' || contrib.status === 'PAID');
                            const isPending = contrib && contrib.status === 'PENDING';
                            const isMe = m.userId === user?.id;
                            const isRecipientForPeriod = m.position === p.periodNumber;
                            const memberPayout = report.payouts.find((payout) => payout.memberId === m.id && payout.periodId === p.id);

                            return (
                              <div key={m.id} className={`rounded-xl border p-3 ${isMe ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100 bg-white'}`}>
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                      isPaid ? 'bg-green-100 text-green-600' : isPending ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'
                                    }`}>
                                      {isPaid ? '✓' : isPending ? '⏳' : '—'}
                                    </div>
                                    <div>
                                      <p className={`text-sm font-medium ${isMe ? 'text-blue-700' : 'text-gray-900'}`}>
                                        {m.name || m.email} {isMe && '(You)'}
                                      </p>
                                      <p className="text-[10px] text-gray-400">Position #{m.position}</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    {contrib ? (
                                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                        isPaid ? 'bg-green-50 text-green-600' : isPending ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                                      }`}>
                                        {isPaid ? 'PAID' : isPending ? 'PENDING' : contrib.status}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-gray-300 font-medium px-2.5 py-1 rounded-full bg-gray-50">No record</span>
                                    )}
                                  </div>
                                </div>
                                {contrib && (
                                  <div className="ml-9 mt-1 text-[10px] text-gray-500 space-y-0.5">
                                    <p>₹{contrib.amount} · {contrib.paymentMethod || 'N/A'} {contrib.referenceNumber ? `· Ref: ${contrib.referenceNumber}` : ''}</p>
                                    <p>{new Date(contrib.createdAt).toLocaleDateString()}</p>
                                  </div>
                                )}
                                {memberPayout && (
                                  <div className="ml-9 mt-1 text-[10px] text-green-600 font-medium">
                                    Payout: ₹{memberPayout.amount} ({memberPayout.status})
                                  </div>
                                )}
                                {isRecipientForPeriod && (
                                  <div className="ml-9 mt-1">
                                    <span className="text-[9px] text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">Recipient for this period</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Payout info for this period */}
                        {payout && (
                          <div className="bg-green-50/50 border-t border-green-100 px-4 py-2">
                            <p className="text-[10px] text-green-600 font-medium">Payout: ₹{payout.amount} → {getMemberName(payout.memberId)}</p>
                          </div>
                        )}

                        {/* My action for this period */}
                        {isActive && myMember && myContrib && myContrib.status === 'PENDING' && (
                          <div className="border-t border-gray-100 px-4 py-3">
                            <button
                              onClick={() => { setShowMarkPayment(myContrib.id); setPaymentAmount(myContrib.amount); }}
                              className="w-full py-2.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl active:scale-[0.98] transition-all shadow-sm"
                            >
                              Mark Payment — ₹{myContrib.amount}
                            </button>
                          </div>
                        )}
                        {isActive && myMember && !myContrib && (
                          <div className="border-t border-gray-100 px-4 py-2">
                            <p className="text-[10px] text-gray-400 text-center">Waiting for contribution record from admin</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'contributions' && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-in fade-in">
              {report.contributions.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No contributions recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {report.periods.map((p) => {
                    const periodContributions = getContributionsForPeriod(p.id);
                    if (periodContributions.length === 0) return null;
                    return (
                      <div key={p.id}>
                        <p className="text-xs font-bold text-gray-700 mb-2">Period {p.periodNumber}</p>
                        <div className="space-y-2">
                          {periodContributions.map((c) => (
                            <div key={c.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                              <div>
                                <p className="text-sm font-medium text-gray-900">{getMemberName(c.memberId)}</p>
                                <p className="text-[10px] text-gray-500">₹{c.amount} · {c.paymentMethod || 'N/A'} {c.referenceNumber ? `· Ref: ${c.referenceNumber}` : ''}</p>
                                <p className="text-[10px] text-gray-400">{new Date(c.createdAt).toLocaleString()}</p>
                              </div>
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                c.status === 'VERIFIED' ? 'bg-green-50 text-green-600' : c.status === 'PAID' ? 'bg-blue-50 text-blue-600' : c.status === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                              }`}>{c.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === 'payouts' && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-in fade-in">
              {report.payouts.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No payouts recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {report.payouts.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{getMemberName(p.memberId)}</p>
                        <p className="text-xs text-gray-600">₹{p.amount}</p>
                        <p className="text-[10px] text-gray-500">{p.referenceNumber ? `Ref: ${p.referenceNumber}` : 'No reference'}</p>
                        <p className="text-[10px] text-gray-400">{new Date(p.createdAt).toLocaleString()}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        p.status === 'COMPLETED' ? 'bg-green-50 text-green-600' : p.status === 'PAID' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                      }`}>{p.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showMarkPayment && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md sm:mx-4 p-6 animate-in slide-in-from-bottom-4">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Mark Payment</h3>
            <p className="text-sm text-gray-500 mb-4">Record your contribution payment</p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount (₹)</label>
                <input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0"
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Payment Method</label>
                <div className="flex gap-2">
                  {(['UPI', 'CASH', 'COD'] as const).map((m) => (
                    <button key={m} onClick={() => setPaymentMethod(m)}
                      className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${paymentMethod === m ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reference Number (optional)</label>
                <input type="text" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="UPI Ref #"
                  className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => { setShowMarkPayment(null); setPaymentRef(''); }} className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
              <button onClick={() => showMarkPayment && handleMarkPayment(showMarkPayment)} disabled={mutating}
                className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 active:scale-95 transition-all">
                {mutating ? 'Submitting...' : 'Submit Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
