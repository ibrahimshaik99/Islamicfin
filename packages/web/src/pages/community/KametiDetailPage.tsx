import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../lib/useApi';
import { LoadingState, ErrorState, Card, CardContent, Button } from '../../components/ui';
import { StatusBadge } from '../../components/admin/AdminComponents';
import type { KametiReport } from '../../lib/types';

interface PayoutModalState { periodId: string; memberId: string; }

export default function KametiDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { communityId, user } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [tab, setTab] = useState<'overview' | 'members' | 'periods' | 'contributions' | 'payouts'>('overview');
  const [payoutModal, setPayoutModal] = useState<PayoutModalState | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutRef, setPayoutRef] = useState('');

  const { data: report, loading, error, refetch } = useApi<KametiReport>(
    communityId && groupId ? `${prefix}/kameti/groups/${groupId}/report` : null,
  );

  const { mutate, loading: mutating } = useMutation();

  const handleMarkPayout = async () => {
    if (!payoutModal || !report) return;
    try {
      await mutate(`${prefix}/kameti/payouts`, {
        body: {
          groupId,
          periodId: payoutModal.periodId,
          memberId: payoutModal.memberId,
          amount: payoutAmount || report.group.contributionAmount,
          referenceNumber: payoutRef.trim() || undefined,
        },
      });
      setPayoutModal(null);
      setPayoutAmount('');
      setPayoutRef('');
      refetch();
    } catch { /* handled */ }
  };

  const getContributionsForPeriod = (periodId: string) => (report?.contributions || []).filter((c) => c.periodId === periodId);
  const getPayoutForMemberPeriod = (memberId: string, periodId: string) => (report?.payouts || []).find((p) => p.memberId === memberId && p.periodId === periodId);
  const getMemberContributionForPeriod = (memberId: string, periodId: string) => (report?.contributions || []).find((c) => c.memberId === memberId && c.periodId === periodId);
  const totalPeriods = report?.summary.totalPeriods || 0;
  const completedPeriods = report?.summary.completedPeriods || 0;
  const periodsLeft = totalPeriods - completedPeriods;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="flex items-center h-12 px-4 max-w-5xl mx-auto">
          <button onClick={() => navigate(-1)} className="touch-target -ml-2 flex items-center justify-center">
            <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-sm font-semibold text-gray-900 ml-2">Kameti Report</h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-gray-400">Live</span>
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            {report?.group.status === 'ACTIVE' && (
              <button onClick={() => navigate('/community/messages')} className="ml-2 text-gray-500 hover:text-teal-600 transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {loading && <div className="p-8"><LoadingState /></div>}
      {error && <div className="p-4"><ErrorState message={error} onRetry={refetch} /></div>}

      {report && (
        <div className="max-w-5xl mx-auto p-4 space-y-6 animate-in fade-in">
          <Card>
            <CardContent>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{report.group.name}</h2>
                  {report.group.description && <p className="text-sm text-gray-500 mt-1">{report.group.description}</p>}
                </div>
                <StatusBadge status={report.group.status} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                <Stat label="Contribution" value={`₹${report.group.contributionAmount}`} sub={report.group.frequency} />
                <Stat label="Members" value={`${report.summary.activeMembers}/${report.summary.totalMembers}`} sub="active/total" />
                <Stat label="Periods" value={`${completedPeriods}/${totalPeriods}`} sub={`${periodsLeft} left`} />
                <Stat label="Balance" value={`₹${report.summary.balance}`} sub="net balance" />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-600">Total Collected</p>
                  <p className="text-lg font-bold text-green-700">₹{report.summary.totalContributions}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-600">Total Distributed</p>
                  <p className="text-lg font-bold text-blue-700">₹{report.summary.totalPayouts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {(['overview', 'members', 'periods', 'contributions', 'payouts'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors capitalize ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>{t}</button>
            ))}
          </div>

          {tab === 'overview' && (
            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Group Information</h3>
                <div className="space-y-2 text-sm">
                  <Row label="Start Date" value={new Date(report.group.startDate).toLocaleDateString()} />
                  {report.group.endDate && <Row label="End Date" value={new Date(report.group.endDate).toLocaleDateString()} />}
                  <Row label="Total Members" value={String(report.summary.totalMembers)} />
                  <Row label="Active Members" value={String(report.summary.activeMembers)} />
                  <Row label="Completed Periods" value={`${completedPeriods}/${totalPeriods}`} />
                  <Row label="Periods Left" value={String(periodsLeft)} />
                  <Row label="Total Collected" value={`₹${report.summary.totalContributions}`} />
                  <Row label="Total Distributed" value={`₹${report.summary.totalPayouts}`} />
                  <Row label="Balance" value={`₹${report.summary.balance}`} />
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'members' && (
            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Members ({report.members.length})</h3>
                <div className="space-y-2">
                  {report.members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                          <span className="text-xs font-bold text-teal-700">{(m.name || m.email || '?')[0]}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{m.name || m.email}</p>
                          {m.userId === user?.id && <p className="text-[10px] text-teal-500 font-medium">You</p>}
                        </div>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>
                  ))}
                  {report.members.length === 0 && <p className="text-sm text-gray-500">No members yet.</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'periods' && (
            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Periods ({report.periods.length})</h3>
                <div className="space-y-3">
                  {report.periods.map((p) => {
                    const periodContributions = getContributionsForPeriod(p.id);
                    const paidCount = periodContributions.filter((c) => c.status === 'VERIFIED' || c.status === 'PAID').length;
                    const totalMembers = report.summary.activeMembers;
                    const isActive = p.status === 'ACTIVE';
                    const isCompleted = p.status === 'COMPLETED';
                    return (
                      <div key={p.id} className={`rounded-xl p-4 border ${isActive ? 'border-blue-200 bg-blue-50/50' : isCompleted ? 'border-green-200 bg-green-50/50' : 'border-gray-100'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-bold text-gray-900">Period {p.periodNumber}</p>
                            <p className="text-[10px] text-gray-400">{new Date(p.startDate).toLocaleDateString()}</p>
                          </div>
                          <StatusBadge status={p.status} />
                        </div>
                        <div className="flex items-center gap-4 text-[11px]">
                          <span className={`${paidCount === totalMembers ? 'text-green-600 font-bold' : 'text-gray-600'}`}>
                            {paidCount}/{totalMembers} paid
                          </span>
                          {isActive && <span className="text-blue-500 font-medium">Current</span>}
                          {isCompleted && <span className="text-green-500">Done</span>}
                        </div>
                      </div>
                    );
                  })}
                  {report.periods.length === 0 && <p className="text-sm text-gray-500">No periods yet.</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'contributions' && (
            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Contribution History ({report.contributions.length})</h3>
                <div className="space-y-4">
                  {report.periods.map((p) => {
                    return (
                      <div key={p.id}>
                        <p className="text-xs font-bold text-gray-700 mb-2">Period {p.periodNumber}</p>
                        <div className="space-y-2">
                          {report.members.filter((m) => m.status === 'ACTIVE').map((m) => {
                            const contrib = getMemberContributionForPeriod(m.id, p.id);
                            return (
                              <div key={m.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-teal-700">{(m.name || m.email || '?')[0]}</span>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">{m.name || m.email}</p>
                                    {contrib && (
                                      <p className="text-[10px] text-gray-500">
                                        {contrib.paymentMethod || 'N/A'} {contrib.referenceNumber ? `· Ref: ${contrib.referenceNumber}` : ''}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                {contrib ? (
                                  <StatusBadge status={contrib.status} />
                                ) : (
                                  <span className="text-[10px] text-gray-300">No record</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {report.contributions.length === 0 && <p className="text-sm text-gray-500">No contributions recorded yet.</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {tab === 'payouts' && (
            <Card>
              <CardContent>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Mark Payout Per Member ({report.periods.length} periods)</h3>
                <div className="space-y-6">
                  {report.periods.map((p) => {
                    const periodContributions = getContributionsForPeriod(p.id);
                    return (
                      <div key={p.id} className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                          <p className="text-sm font-bold text-gray-900">Period {p.periodNumber}</p>
                          <p className="text-[10px] text-gray-400">{periodContributions.filter((c) => c.status === 'VERIFIED' || c.status === 'PAID').length}/{report.summary.activeMembers} members paid</p>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {report.members.filter((m) => m.status === 'ACTIVE').map((m) => {
                            const contrib = getMemberContributionForPeriod(m.id, p.id);
                            const existingPayout = getPayoutForMemberPeriod(m.id, p.id);
                            return (
                              <div key={m.id} className="px-4 py-3 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-bold text-teal-700">{(m.name || m.email || '?')[0]}</span>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{m.name || m.email}</p>
                                    <p className="text-[10px] text-gray-400">
                                      {contrib ? `Paid: ₹${contrib.amount} (${contrib.status})` : 'No contribution'}
                                    </p>
                                    {existingPayout && (
                                      <p className="text-[10px] text-green-600 font-medium">
                                        Payout: ₹{existingPayout.amount} ({existingPayout.status})
                                        {existingPayout.referenceNumber ? ` · Ref: ${existingPayout.referenceNumber}` : ''}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="shrink-0">
                                  {existingPayout ? (
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-600">Paid</span>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setPayoutModal({ periodId: p.id, memberId: m.id });
                                        setPayoutAmount(contrib?.amount || report.group.contributionAmount);
                                        setPayoutRef('');
                                      }}
                                      className="px-3 py-1.5 text-[11px] font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors"
                                    >
                                      Mark Payout
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {report.periods.length === 0 && <p className="text-sm text-gray-500">No periods yet.</p>}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {payoutModal && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            {(() => {
              const period = report.periods.find((p) => p.id === payoutModal.periodId);
              const member = report.members.find((m) => m.id === payoutModal.memberId);
              const contrib = getMemberContributionForPeriod(payoutModal.memberId, payoutModal.periodId);
              return (
                <>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Record Payout</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Pay {member?.name || member?.email || 'Unknown'} for Period {period?.periodNumber}
                  </p>
                  {contrib && (
                    <div className="bg-gray-50 rounded-xl p-3 mb-4">
                      <p className="text-xs text-gray-500">Member's contribution: ₹{contrib.amount} ({contrib.status})</p>
                      {contrib.paymentMethod && <p className="text-xs text-gray-400">Method: {contrib.paymentMethod}</p>}
                      {contrib.referenceNumber && <p className="text-xs text-gray-400">Ref: {contrib.referenceNumber}</p>}
                    </div>
                  )}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                      <input type="number" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reference (optional)</label>
                      <input value={payoutRef} onChange={(e) => setPayoutRef(e.target.value)} placeholder="UPI Ref #" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-5">
                    <button onClick={() => { setPayoutModal(null); setPayoutAmount(''); setPayoutRef(''); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
                    <Button onClick={handleMarkPayout} loading={mutating}>Confirm Payout</Button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
      {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
