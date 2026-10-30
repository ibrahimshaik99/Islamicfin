import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../lib/useApi';
import { useRealtimeConversations, useRealtimeMessages } from '../../lib/useRealtime';
import { LoadingState, ErrorState, EmptyStateCard, UserAvatar } from '../../components/ui';
import { ChatThread } from '../../components/chat';
import { conversationTitle } from '../../components/chat/chatUtils';
import type { KametiReport, KametiContribution } from '../../lib/types';

/**
 * Community-manager Kameti workspace.
 *
 * Tabs: Overview / Members / Contributions / Payouts / Transactions / Chat /
 * Settings. Manager-only actions (mark PAID, verify, record payout, edit
 * group) call the kameti:manage-protected routes. All errors from mutate()
 * are surfaced visibly (mutate returns null on failure).
 */
type Tab = 'overview' | 'members' | 'contributions' | 'payouts' | 'transactions' | 'chat' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'members', label: 'Members' },
  { id: 'contributions', label: 'Contributions' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'chat', label: 'Chat' },
  { id: 'settings', label: 'Settings' },
];

interface PayoutModalState {
  periodId: string;
  memberId: string;
}

export default function KametiDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { communityId, user } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [tab, setTab] = useState<Tab>('overview');
  const [payoutModal, setPayoutModal] = useState<PayoutModalState | null>(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutRef, setPayoutRef] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<string | null>(null);

  const { data: report, loading, error, refetch } = useApi<KametiReport>(
    communityId && groupId ? `${prefix}/kameti/groups/${groupId}/report` : null,
  );

  // Chat tab: community KAMETI conversation.
  const { conversations, loading: convLoad } = useRealtimeConversations(
    communityId && tab === 'chat' ? communityId : null,
    user?.id,
  );
  const kametiConv = conversations.find((c) => c.type === 'KAMETI') || null;
  const {
    messages,
    loading: msgLoad,
    error: msgErr,
    refetch: refetchMsg,
    sendMessage,
  } = useRealtimeMessages(communityId, tab === 'chat' ? kametiConv?.id : null);

  const { mutate } = useMutation();

  const flash = (msg: string | null, ok: boolean) => {
    if (ok) {
      setActionSuccess(msg);
      setActionError(null);
    } else {
      setActionError(msg);
      setActionSuccess(null);
    }
  };

  /** Wrap a mutation with visible success/error feedback. */
  const runAction = async (
    path: string,
    body: unknown,
    successMsg: string,
    failMsg: string,
    method = 'POST',
  ) => {
    const res = await mutate(path, { method, body });
    if (res === null) {
      flash(failMsg, false);
      return false;
    }
    flash(successMsg, true);
    refetch();
    return true;
  };

  const markPaid = (contributionId: string) =>
    runAction(
      `${prefix}/kameti/contributions/${contributionId}/pay`,
      undefined,
      'Contribution marked as PAID.',
      'Could not mark the contribution as paid.',
    );

  const verifyContribution = (contributionId: string) =>
    runAction(
      `${prefix}/kameti/contributions/${contributionId}/verify`,
      undefined,
      'Contribution verified.',
      'Could not verify the contribution.',
    );

  const handleMarkPayout = async () => {
    if (!payoutModal || !report) return;
    const ok = await runAction(
      `${prefix}/kameti/payouts`,
      {
        memberId: payoutModal.memberId,
        periodId: payoutModal.periodId,
        amount: payoutAmount || report.group.contributionAmount,
        referenceNumber: payoutRef.trim() || undefined,
      },
      'Payout recorded.',
      'Could not record the payout.',
    );
    if (ok) {
      setPayoutModal(null);
      setPayoutAmount('');
      setPayoutRef('');
    }
  };

  const handleSaveSettings = async () => {
    if (!groupId) return;
    const body: Record<string, string> = {};
    if (nameDraft !== null && nameDraft.trim()) body.name = nameDraft.trim();
    if (statusDraft !== null) body.status = statusDraft;
    if (Object.keys(body).length === 0) {
      flash('Nothing to update.', false);
      return;
    }
    const ok = await runAction(
      `${prefix}/kameti/groups/${groupId}`,
      body,
      'Group settings updated.',
      'Could not update group settings.',
      'PATCH',
    );
    if (ok) {
      setNameDraft(null);
      setStatusDraft(null);
    }
  };

  const getMemberName = (memberId: string) => {
    const m = report?.members.find((x) => x.id === memberId);
    return m?.name || m?.email || 'Unknown member';
  };
  const getContrib = (memberId: string, periodId: string): KametiContribution | undefined =>
    report?.contributions.find((c) => c.memberId === memberId && c.periodId === periodId);
  const getPayout = (memberId: string, periodId: string) =>
    report?.payouts.find((p) => p.memberId === memberId && p.periodId === periodId);

  const totalPeriods = report?.summary.totalPeriods || 0;
  const completedPeriods = report?.summary.completedPeriods || 0;

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-primary-700 text-white sticky top-0 z-30 safe-top">
        <div className="max-w-5xl mx-auto flex items-center gap-3 h-14 px-4">
          <button
            onClick={() => navigate(-1)}
            aria-label="Go back"
            className="touch-target -ml-2 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold truncate">{report?.group.name || 'Kameti'}</h1>
            <p className="text-[11px] text-white/70 truncate">Kameti workspace</p>
          </div>
          <button
            onClick={() => navigate('/community/kameti')}
            className="px-3 py-1.5 text-[11px] font-semibold bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
          >
            All groups
          </button>
        </div>
      </div>

      {loading && <div className="p-8"><LoadingState /></div>}
      {error && <div className="max-w-5xl mx-auto p-4"><ErrorState message={error} onRetry={refetch} /></div>}

      {(actionError || actionSuccess) && (
        <div className="max-w-5xl mx-auto px-4 pt-4">
          <div
            className={`flex items-start gap-2 rounded-xl px-4 py-3 border ${
              actionSuccess ? 'bg-primary-50 border-primary-200' : 'bg-red-50 border-red-200'
            }`}
          >
            <p className={`text-sm flex-1 ${actionSuccess ? 'text-primary-800' : 'text-red-700'}`}>
              {actionSuccess || actionError}
            </p>
            <button
              onClick={() => {
                setActionError(null);
                setActionSuccess(null);
              }}
              aria-label="Dismiss"
              className={actionSuccess ? 'text-primary-500' : 'text-red-500'}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {report && (
        <div className="max-w-5xl mx-auto p-4 space-y-4 animate-in">
          {/* Summary */}
          <div className="bg-white rounded-2xl border border-line shadow-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-ink truncate">{report.group.name}</h2>
                {report.group.description && <p className="text-sm text-muted mt-1">{report.group.description}</p>}
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                  report.group.status === 'ACTIVE' ? 'bg-primary-50 text-primary-700' : 'bg-surface text-muted border border-line'
                }`}
              >
                {report.group.status}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <Tile label="Contribution" value={`₹${report.group.contributionAmount}`} sub={report.group.frequency.toLowerCase()} tint="bg-primary-50 text-primary-700" />
              <Tile label="Members" value={`${report.summary.activeMembers}/${report.summary.totalMembers}`} sub="active/total" tint="bg-sky-50 text-sky-700" />
              <Tile label="Periods" value={`${completedPeriods}/${totalPeriods}`} sub="completed" tint="bg-gold-50 text-gold-700" />
              <Tile label="Balance" value={`₹${report.summary.balance}`} sub="in hand" tint="bg-emerald-50 text-emerald-700" />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white p-1 rounded-xl border border-line shadow-card overflow-x-auto hide-scrollbar" role="tablist" aria-label="Kameti sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 min-w-[84px] py-2 text-xs font-bold rounded-lg transition-colors capitalize ${
                  tab === t.id ? 'bg-primary-600 text-white' : 'text-muted hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Overview */}
          {tab === 'overview' && (
            <div className="bg-white rounded-2xl border border-line shadow-card p-5 space-y-3">
              <InfoRow label="Start date" value={new Date(report.group.startDate).toLocaleDateString('en-IN')} />
              {report.group.endDate && <InfoRow label="End date" value={new Date(report.group.endDate).toLocaleDateString('en-IN')} />}
              <InfoRow label="Total collected (verified)" value={`₹${report.summary.totalContributions}`} />
              <InfoRow label="Total distributed (completed)" value={`₹${report.summary.totalPayouts}`} />
              <InfoRow label="Balance" value={`₹${report.summary.balance}`} />
            </div>
          )}

          {/* Members */}
          {tab === 'members' && (
            <div className="bg-white rounded-2xl border border-line shadow-card divide-y divide-line">
              {report.members.length === 0 ? (
                <p className="text-sm text-muted text-center py-8">No members yet.</p>
              ) : (
                report.members.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                    <UserAvatar name={m.name || m.email || '?'} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{m.name || m.email}</p>
                      <p className="text-[11px] text-muted">Payout position #{m.position}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        m.status === 'ACTIVE' ? 'bg-primary-50 text-primary-700' : 'bg-surface text-muted border border-line'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Contributions (manager workflow: PAID → VERIFIED) */}
          {tab === 'contributions' && (
            <div className="space-y-3">
              {report.periods.length === 0 && (
                <div className="bg-white rounded-2xl border border-line">
                  <EmptyStateCard title="No periods yet" description="Periods are generated when the group starts." />
                </div>
              )}
              {report.periods.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl border border-line shadow-card overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-surface/50">
                    <div>
                      <p className="text-sm font-bold text-ink">Period {p.periodNumber}</p>
                      <p className="text-[11px] text-muted">Due {new Date(p.dueDate).toLocaleDateString('en-IN')}</p>
                    </div>
                    <PeriodStatusBadge status={p.status} />
                  </div>
                  <div className="divide-y divide-line">
                    {report.members.filter((m) => m.status === 'ACTIVE').map((m) => {
                      const contrib = getContrib(m.id, p.id);
                      return (
                        <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-ink truncate">{m.name || m.email}</p>
                            {contrib ? (
                              <p className="text-[11px] text-muted truncate">
                                ₹{contrib.amount} · {contrib.paymentMethod || '—'}
                                {contrib.referenceNumber ? ` · Ref ${contrib.referenceNumber}` : ''}
                              </p>
                            ) : (
                              <p className="text-[11px] text-muted">No record</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {contrib ? (
                              <>
                                <ContributionBadge status={contrib.status} />
                                {contrib.status === 'PENDING' && (
                                  <button
                                    onClick={() => markPaid(contrib.id)}
                                    className="px-2.5 py-1 text-[10px] font-bold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
                                  >
                                    Mark PAID
                                  </button>
                                )}
                                {contrib.status === 'PAID' && (
                                  <button
                                    onClick={() => verifyContribution(contrib.id)}
                                    className="px-2.5 py-1 text-[10px] font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                                  >
                                    Verify
                                  </button>
                                )}
                              </>
                            ) : (
                              <span className="text-[10px] text-muted">—</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payouts (per member×period) */}
          {tab === 'payouts' && (
            <div className="space-y-3">
              {report.periods.length === 0 && (
                <div className="bg-white rounded-2xl border border-line">
                  <EmptyStateCard title="No periods yet" description="Payouts appear once periods exist." />
                </div>
              )}
              {report.periods.map((p) => (
                <div key={p.id} className="bg-white rounded-2xl border border-line shadow-card overflow-hidden">
                  <div className="px-4 py-3 border-b border-line bg-surface/50">
                    <p className="text-sm font-bold text-ink">Period {p.periodNumber}</p>
                    <p className="text-[11px] text-muted">Due {new Date(p.dueDate).toLocaleDateString('en-IN')}</p>
                  </div>
                  <div className="divide-y divide-line">
                    {report.members.filter((m) => m.status === 'ACTIVE').map((m) => {
                      const contrib = getContrib(m.id, p.id);
                      const existing = getPayout(m.id, p.id);
                      return (
                        <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-ink truncate">{m.name || m.email}</p>
                            <p className="text-[11px] text-muted truncate">
                              {contrib ? `Contribution ₹${contrib.amount} (${contrib.status})` : 'No contribution'}
                            </p>
                            {existing && (
                              <p className="text-[11px] text-primary-700 font-medium">
                                Payout ₹{existing.amount} ({existing.status})
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            {existing ? (
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary-50 text-primary-700">Paid</span>
                            ) : (
                              <button
                                onClick={() => {
                                  setPayoutModal({ periodId: p.id, memberId: m.id });
                                  setPayoutAmount(contrib?.amount || report.group.contributionAmount);
                                  setPayoutRef('');
                                }}
                                className="px-3 py-1.5 text-[11px] font-bold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
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
              ))}
            </div>
          )}

          {/* Transactions */}
          {tab === 'transactions' && (
            <div className="bg-white rounded-2xl border border-line shadow-card divide-y divide-line">
              {(() => {
                const ledger = [
                  ...report.contributions.map((c) => ({
                    kind: 'in' as const,
                    id: c.id,
                    amount: c.amount,
                    status: c.status,
                    who: getMemberName(c.memberId),
                    periodId: c.periodId,
                    date: c.createdAt,
                  })),
                  ...report.payouts.map((p) => ({
                    kind: 'out' as const,
                    id: p.id,
                    amount: p.amount,
                    status: p.status,
                    who: getMemberName(p.memberId),
                    periodId: p.periodId,
                    date: p.createdAt,
                  })),
                ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                if (ledger.length === 0) {
                  return <p className="text-sm text-muted text-center py-8">No transactions yet.</p>;
                }
                return ledger.map((t) => {
                  const period = report.periods.find((x) => x.id === t.periodId);
                  const isIn = t.kind === 'in';
                  return (
                    <div key={`${t.kind}-${t.id}`} className="flex items-center gap-3 px-4 py-3">
                      <span
                        className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isIn ? 'bg-primary-50 text-primary-600' : 'bg-sky-50 text-sky-600'
                        }`}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          {isIn ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m0-15l-6 6m6-6l6 6" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 15l6-6m-6 6l-6-6" />
                          )}
                        </svg>
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-ink truncate">
                          {isIn ? 'Contribution from' : 'Payout to'} {t.who}
                        </p>
                        <p className="text-[11px] text-muted">
                          Period {period?.periodNumber ?? '—'} · {new Date(t.date).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-sm font-bold ${isIn ? 'text-primary-600' : 'text-ink'}`}>
                          {isIn ? '+' : '−'}₹{t.amount}
                        </p>
                        <span className="text-[10px] text-muted">{t.status}</span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}

          {/* Chat */}
          {tab === 'chat' && (
            <div className="bg-white rounded-2xl border border-line shadow-card overflow-hidden">
              {convLoad && <div className="p-6"><LoadingState /></div>}
              {!convLoad && !kametiConv && (
                <EmptyStateCard
                  title="No group chat yet"
                  description="The Kameti conversation is created when the group gets its first member."
                />
              )}
              {kametiConv && (
                <div className="h-[60vh]">
                  <ChatThread
                    communityId={communityId}
                    conversationId={kametiConv.id}
                    title={conversationTitle(kametiConv)}
                    memberCount={kametiConv.memberCount}
                    type={kametiConv.type}
                    messages={messages}
                    loading={msgLoad}
                    error={msgErr}
                    currentUserId={user?.id}
                    onSend={async (body) => {
                      const ok = await sendMessage(body);
                      if (ok) refetchMsg();
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Settings (kameti:manage) */}
          {tab === 'settings' && (
            <div className="bg-white rounded-2xl border border-line shadow-card p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Group name</label>
                <input
                  type="text"
                  value={nameDraft ?? report.group.name}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={200}
                  className="w-full px-3 py-2.5 text-sm bg-surface border border-line rounded-xl text-ink focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/15"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Status</label>
                <select
                  value={statusDraft ?? report.group.status}
                  onChange={(e) => setStatusDraft(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-surface border border-line rounded-xl text-ink focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/15"
                >
                  {['ACTIVE', 'COMPLETED', 'CANCELLED', 'PAUSED'].map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted mt-1.5">
                  Contribution amount and frequency are fixed at creation to protect members.
                </p>
              </div>
              <button
                onClick={handleSaveSettings}
                className="w-full py-2.5 text-sm font-bold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors"
              >
                Save settings
              </button>
            </div>
          )}
        </div>
      )}

      {/* Payout modal */}
      {payoutModal && report && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-[2px] animate-in" role="dialog" aria-modal="true" aria-label="Record payout">
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-soft p-6 safe-bottom">
            {(() => {
              const period = report.periods.find((p) => p.id === payoutModal.periodId);
              const member = report.members.find((m) => m.id === payoutModal.memberId);
              const contrib = getContrib(payoutModal.memberId, payoutModal.periodId);
              return (
                <>
                  <h3 className="text-base font-bold text-ink">Record payout</h3>
                  <p className="text-sm text-muted mt-1">
                    Pay {member?.name || member?.email || 'member'} for Period {period?.periodNumber}
                  </p>
                  {contrib && (
                    <div className="mt-3 bg-surface border border-line rounded-xl px-3 py-2.5">
                      <p className="text-xs text-muted">
                        Their contribution: ₹{contrib.amount} ({contrib.status})
                        {contrib.referenceNumber ? ` · Ref ${contrib.referenceNumber}` : ''}
                      </p>
                    </div>
                  )}
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1.5">Amount (₹)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm bg-surface border border-line rounded-xl text-ink focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/15"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-ink mb-1.5">Reference (optional)</label>
                      <input
                        value={payoutRef}
                        onChange={(e) => setPayoutRef(e.target.value)}
                        placeholder="UPI ref / receipt no"
                        maxLength={255}
                        className="w-full px-3 py-2.5 text-sm bg-surface border border-line rounded-xl text-ink placeholder:text-muted focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/15"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => {
                        setPayoutModal(null);
                        setPayoutAmount('');
                        setPayoutRef('');
                      }}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-line text-sm font-semibold text-ink hover:bg-surface transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleMarkPayout}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
                    >
                      Confirm payout
                    </button>
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

function Tile({ label, value, sub, tint }: { label: string; value: string; sub: string; tint: string }) {
  return (
    <div className={`rounded-xl p-3 ${tint}`}>
      <p className="text-[10px] font-medium opacity-80">{label}</p>
      <p className="text-lg font-bold leading-tight mt-0.5">{value}</p>
      <p className="text-[10px] opacity-70">{sub}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </div>
  );
}

function PeriodStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: 'bg-primary-50 text-primary-700',
    COMPLETED: 'bg-emerald-50 text-emerald-700',
    DEFAULTED: 'bg-red-50 text-red-600',
    PENDING: 'bg-surface text-muted border border-line',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${styles[status] || styles.PENDING}`}>{status}</span>
  );
}

function ContributionBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    VERIFIED: 'bg-primary-50 text-primary-700',
    PAID: 'bg-sky-50 text-sky-700',
    PENDING: 'bg-gold-50 text-gold-700',
    REJECTED: 'bg-red-50 text-red-600',
    LATE: 'bg-orange-50 text-orange-600',
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${styles[status] || 'bg-surface text-muted'}`}>{status}</span>
  );
}
