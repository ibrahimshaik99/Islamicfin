import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../lib/useApi';
import { useRealtimeConversations, useRealtimeMessages } from '../../lib/useRealtime';
import { LoadingState, EmptyStateCard, UserAvatar } from '../../components/ui';
import { ChatThread } from '../../components/chat';
import { conversationTitle } from '../../components/chat/chatUtils';
import type { KametiReport, KametiContribution, KametiPeriod } from '../../lib/types';

/**
 * Customer Kameti workspace.
 *
 * Tabs: Overview / Members / Contributions / Payouts / Transactions / Chat.
 * Payment self-reporting uses POST /kameti/groups/:groupId/my-contribution —
 * the server sets the amount from the group config and the treasurer verifies.
 * (The old UI called the admin-only /contributions/:id/pay route, which 403'd
 * for customers.)
 */
type Tab = 'overview' | 'members' | 'contributions' | 'payouts' | 'transactions' | 'chat';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'members', label: 'Members' },
  { id: 'contributions', label: 'Contributions' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'chat', label: 'Chat' },
];

const PAY_METHODS = ['UPI', 'CASH', 'BANK_TRANSFER', 'OTHER'] as const;
type PayMethod = (typeof PAY_METHODS)[number];

/** Join returns { data: <added member>, conversationId } — conversationId at the top level. */
interface JoinKametiResponse {
  data: unknown;
  conversationId?: string;
}

export default function CustomerKametiDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { communityId, user } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [tab, setTab] = useState<Tab>('overview');

  // Payment self-report modal
  const [reportOpen, setReportOpen] = useState(false);
  const [reportPeriodId, setReportPeriodId] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>('UPI');
  const [payRef, setPayRef] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const { data: report, loading, error, refetch } = useApi<KametiReport>(
    communityId && groupId ? `${prefix}/kameti/groups/${groupId}/report` : null,
  );

  // Chat tab: reuse the community's KAMETI conversation.
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

  const { mutate } = useMutation<JoinKametiResponse>();

  const isMember = report?.members.some((m) => m.userId === user?.id && m.status === 'ACTIVE');
  const myMember = report?.members.find((m) => m.userId === user?.id);

  const activePeriod = report?.periods.find((p) => p.status === 'ACTIVE') || null;
  const myActiveContribution = activePeriod && myMember
    ? report?.contributions.find(
        (c) => c.memberId === myMember.id && c.periodId === activePeriod.id,
      )
    : undefined;
  const canSelfReport =
    !!isMember &&
    !!activePeriod &&
    (!myActiveContribution || myActiveContribution.status === 'PENDING' || myActiveContribution.status === 'REJECTED');

  const handleJoin = async () => {
    if (!groupId) return;
    setJoining(true);
    setActionError(null);
    try {
      const res = await mutate(
        `${prefix}/kameti/groups/${groupId}/join`,
        { method: 'POST' },
      );
      if (!res) {
        setActionError('Could not join the group. Please try again.');
        return;
      }
      refetch();
      // The join route returns conversationId at the TOP level (not inside data).
      if (res.conversationId) {
        navigate(`/app/messages?conversationId=${res.conversationId}`);
      }
    } finally {
      setJoining(false);
    }
  };

  const openReportModal = () => {
    setActionError(null);
    setPayRef('');
    setPayMethod('UPI');
    setReportPeriodId(activePeriod?.id ?? null);
    setReportOpen(true);
  };

  const submitReport = async () => {
    if (!groupId || !reportPeriodId) return;
    setActionError(null);
    const res = await mutate(`${prefix}/kameti/groups/${groupId}/my-contribution`, {
      body: {
        periodId: reportPeriodId,
        paymentMethod: payMethod,
        referenceNumber: payRef.trim() || undefined,
      },
    });
    if (!res) {
      setActionError('Could not record your payment. Please check your connection and try again.');
      return;
    }
    setReportOpen(false);
    setActionSuccess('Payment reported. Your treasurer will verify it shortly.');
    refetch();
  };

  const getMemberName = (memberId: string) => {
    const m = report?.members.find((x) => x.id === memberId);
    return m?.name || m?.email || 'Unknown member';
  };

  const getMemberContribution = (memberId: string, periodId: string): KametiContribution | undefined =>
    report?.contributions.find((c) => c.memberId === memberId && c.periodId === periodId);

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="bg-primary-700 text-white sticky top-0 z-30 safe-top">
        <div className="max-w-4xl mx-auto flex items-center gap-3 h-14 px-4">
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
            <p className="text-[11px] text-white/70 truncate">
              {report
                ? `₹${report.group.contributionAmount} · ${report.group.frequency.toLowerCase()} · ${report.summary.activeMembers} members`
                : 'Community savings circle'}
            </p>
          </div>
          <button
            onClick={() => refetch()}
            aria-label="Refresh"
            className="touch-target flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
          >
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </svg>
          </button>
        </div>
      </div>

      {loading && <div className="p-8"><LoadingState /></div>}
      {error && (
        <div className="max-w-4xl mx-auto p-4">
          <div className="bg-white rounded-2xl border border-line">
            <EmptyStateCard
              title="Cannot open this Kameti group"
              description={error}
              action={
                <button
                  onClick={() => navigate('/app/kameti')}
                  className="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
                >
                  Back to Kameti
                </button>
              }
            />
          </div>
        </div>
      )}

      {actionSuccess && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="flex items-start gap-2 bg-primary-50 border border-primary-200 rounded-xl px-4 py-3">
            <svg className="h-4 w-4 text-primary-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <p className="text-sm text-primary-800 flex-1">{actionSuccess}</p>
            <button onClick={() => setActionSuccess(null)} aria-label="Dismiss" className="text-primary-500 hover:text-primary-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {report && (
        <div className="max-w-4xl mx-auto p-4 space-y-4 animate-in">
          {/* Summary card */}
          <div className="bg-white rounded-2xl border border-line shadow-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-ink truncate">{report.group.name}</h2>
                {report.group.description && (
                  <p className="text-sm text-muted mt-1">{report.group.description}</p>
                )}
              </div>
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                  report.group.status === 'ACTIVE'
                    ? 'bg-primary-50 text-primary-700'
                    : 'bg-surface text-muted border border-line'
                }`}
              >
                {report.group.status === 'ACTIVE' && <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />}
                {report.group.status}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <SummaryTile label="Contribution" value={`₹${report.group.contributionAmount}`} sub={report.group.frequency.toLowerCase()} tint="bg-primary-50 text-primary-700" />
              <SummaryTile label="Collected" value={`₹${report.summary.totalContributions}`} sub="verified" tint="bg-emerald-50 text-emerald-700" />
              <SummaryTile label="Distributed" value={`₹${report.summary.totalPayouts}`} sub="payouts" tint="bg-sky-50 text-sky-700" />
              <SummaryTile label="Balance" value={`₹${report.summary.balance}`} sub="in hand" tint="bg-gold-50 text-gold-700" />
            </div>

            {activePeriod && (
              <div className="mt-4 flex items-center gap-2 bg-gold-50 border border-gold-200 rounded-xl px-4 py-2.5">
                <svg className="h-4 w-4 text-gold-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                <p className="text-xs text-gold-800">
                  <span className="font-bold">Period {activePeriod.periodNumber}</span> is active — due{' '}
                  {new Date(activePeriod.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            )}

            {!isMember && report.group.status === 'ACTIVE' && (
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full mt-4 py-3 text-sm font-bold text-white bg-primary-600 rounded-xl hover:bg-primary-700 disabled:opacity-50 active:scale-[0.98] transition-all"
              >
                {joining ? 'Joining…' : 'Join This Kameti'}
              </button>
            )}

            {canSelfReport && (
              <button
                onClick={openReportModal}
                className="w-full mt-3 py-3 text-sm font-bold text-primary-700 bg-primary-50 border border-primary-200 rounded-xl hover:bg-primary-100 active:scale-[0.98] transition-all"
              >
                {myActiveContribution?.status === 'PENDING'
                  ? `Re-report Payment — ₹${report.group.contributionAmount}`
                  : `I Paid — Report ₹${report.group.contributionAmount}`}
              </button>
            )}
            {isMember && myActiveContribution?.status === 'VERIFIED' && (
              <p className="mt-3 text-xs text-primary-700 bg-primary-50 border border-primary-200 rounded-xl px-4 py-2.5 text-center font-medium">
                ✓ Your Period {activePeriod?.periodNumber} contribution is verified.
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white p-1 rounded-xl border border-line shadow-card overflow-x-auto hide-scrollbar" role="tablist" aria-label="Kameti sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 min-w-[80px] py-2 text-xs font-bold rounded-lg transition-colors capitalize ${
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
              {report.group.endDate && (
                <InfoRow label="End date" value={new Date(report.group.endDate).toLocaleDateString('en-IN')} />
              )}
              <InfoRow label="Members" value={`${report.summary.activeMembers} active / ${report.summary.totalMembers} total`} />
              <InfoRow label="Periods" value={`${report.summary.completedPeriods} of ${report.summary.totalPeriods} completed`} />
              <InfoRow
                label="Your position"
                value={myMember ? `#${myMember.position}` : 'Not a member'}
              />
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
                      <p className="text-sm font-semibold text-ink truncate">
                        {m.name || m.email}
                        {m.userId === user?.id && <span className="text-primary-600"> (You)</span>}
                      </p>
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

          {/* Contributions (per period grid) */}
          {tab === 'contributions' && (
            <div className="space-y-3">
              {report.periods.length === 0 && (
                <div className="bg-white rounded-2xl border border-line">
                  <EmptyStateCard title="No periods yet" description="Periods are generated when the group starts." />
                </div>
              )}
              {report.periods.map((p) => {
                const paidCount = report.contributions.filter(
                  (c) => c.periodId === p.id && (c.status === 'VERIFIED' || c.status === 'PAID'),
                ).length;
                return (
                  <div key={p.id} className="bg-white rounded-2xl border border-line shadow-card overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                      <div>
                        <p className="text-sm font-bold text-ink">Period {p.periodNumber}</p>
                        <p className="text-[11px] text-muted">
                          Due {new Date(p.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <PeriodStatusBadge status={p.status} />
                        <p className="text-[11px] text-muted mt-1">
                          {paidCount}/{report.summary.activeMembers} paid
                        </p>
                      </div>
                    </div>
                    <div className="divide-y divide-line">
                      {report.members.filter((m) => m.status === 'ACTIVE').map((m) => {
                        const contrib = getMemberContribution(m.id, p.id);
                        return (
                          <div key={m.id} className="flex items-center justify-between px-4 py-2.5">
                            <p className={`text-xs truncate ${m.userId === user?.id ? 'font-bold text-primary-700' : 'text-ink'}`}>
                              {m.name || m.email}{m.userId === user?.id ? ' (You)' : ''}
                            </p>
                            {contrib ? (
                              <ContributionBadge status={contrib.status} />
                            ) : (
                              <span className="text-[10px] text-muted">No record</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Payouts */}
          {tab === 'payouts' && (
            <div className="bg-white rounded-2xl border border-line shadow-card divide-y divide-line">
              {report.payouts.length === 0 ? (
                <p className="text-sm text-muted text-center py-8">No payouts recorded yet.</p>
              ) : (
                report.payouts.map((p) => {
                  const period = report.periods.find((x) => x.id === p.periodId);
                  return (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{getMemberName(p.memberId)}</p>
                        <p className="text-[11px] text-muted">
                          Period {period?.periodNumber ?? '—'} · {new Date(p.createdAt).toLocaleDateString('en-IN')}
                          {p.referenceNumber ? ` · Ref: ${p.referenceNumber}` : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="text-sm font-bold text-ink">₹{p.amount}</p>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.status === 'COMPLETED'
                              ? 'bg-primary-50 text-primary-700'
                              : 'bg-gold-50 text-gold-700'
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Transactions (combined chronological ledger) */}
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
                    ref: c.referenceNumber,
                  })),
                  ...report.payouts.map((p) => ({
                    kind: 'out' as const,
                    id: p.id,
                    amount: p.amount,
                    status: p.status,
                    who: getMemberName(p.memberId),
                    periodId: p.periodId,
                    date: p.createdAt,
                    ref: p.referenceNumber,
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
                          {t.ref ? ` · Ref: ${t.ref}` : ''}
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
                  description={
                    isMember
                      ? 'The Kameti chat becomes available once the group is active.'
                      : 'Join this Kameti group to access the member chat.'
                  }
                  action={
                    !isMember && report.group.status === 'ACTIVE' ? (
                      <button
                        onClick={handleJoin}
                        disabled={joining}
                        className="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50"
                      >
                        {joining ? 'Joining…' : 'Join to unlock chat'}
                      </button>
                    ) : undefined
                  }
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
                      if (ok) {
                        refetchMsg();
                      }
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Self-report payment modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/40 backdrop-blur-[2px] animate-in" role="dialog" aria-modal="true" aria-label="Report payment">
          <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-soft p-6 safe-bottom">
            <h3 className="text-base font-bold text-ink">Report your payment</h3>
            <p className="text-sm text-muted mt-1">
              Amount is fixed by the group: <span className="font-bold text-ink">₹{report?.group.contributionAmount}</span>. Your
              treasurer verifies every report.
            </p>

            {actionError && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <p className="text-xs text-red-700">{actionError}</p>
              </div>
            )}

            <div className="mt-4 space-y-4">
              {report && report.periods.filter((p) => p.status !== 'COMPLETED').length > 1 && (
                <div>
                  <label className="block text-xs font-semibold text-ink mb-1.5">Period</label>
                  <select
                    value={reportPeriodId ?? ''}
                    onChange={(e) => setReportPeriodId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-surface border border-line rounded-xl text-ink focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/15"
                  >
                    {report.periods.filter((p) => p.status !== 'COMPLETED').map((p: KametiPeriod) => (
                      <option key={p.id} value={p.id}>
                        Period {p.periodNumber} — due {new Date(p.dueDate).toLocaleDateString('en-IN')}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Payment method</label>
                <div className="grid grid-cols-4 gap-2">
                  {PAY_METHODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPayMethod(m)}
                      className={`py-2 text-[11px] font-bold rounded-xl transition-colors ${
                        payMethod === m
                          ? 'bg-primary-600 text-white'
                          : 'bg-surface text-muted border border-line'
                      }`}
                    >
                      {m.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink mb-1.5">Reference number (optional)</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="UPI transaction ref"
                  maxLength={255}
                  className="w-full px-3 py-2.5 text-sm bg-surface border border-line rounded-xl text-ink placeholder:text-muted focus:bg-white focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/15"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-line text-sm font-semibold text-ink hover:bg-surface transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReport}
                disabled={!reportPeriodId}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                Submit report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Non-member notice for report access errors */}
      {!isMember && !loading && !error && report && report.group.status !== 'ACTIVE' && (
        <div className="max-w-4xl mx-auto px-4 pb-6">
          <div className="bg-white rounded-2xl border border-line">
            <EmptyStateCard
              title={`This group is ${report.group.status.toLowerCase()}`}
              description="Only active groups accept new members or contributions."
              action={
                <button
                  onClick={() => navigate('/app/kameti')}
                  className="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold hover:bg-primary-700 transition-colors"
                >
                  Browse other groups
                </button>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryTile({ label, value, sub, tint }: { label: string; value: string; sub: string; tint: string }) {
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
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${styles[status] || styles.PENDING}`}>
      {status}
    </span>
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
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${styles[status] || 'bg-surface text-muted'}`}>
      {status}
    </span>
  );
}
