import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { communityNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../lib/useApi';
import { LoadingState, ErrorState, Button, Card, CardContent } from '../../components/ui';
import { useAdminList, DataTable, StatusBadge, Pagination } from '../../components/admin/AdminComponents';

export default function QardHasanPage() {
  const { communityId } = useAuth();
  const navigate = useNavigate();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', principalAmount: '', borrowerId: '', duration: '12', purpose: '' });
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { mutate, loading: mutating, error: mutationError, resetError } = useMutation();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  const { data: members } = useApi<Array<{ id: string; userName: string; userEmail: string }>>(
    communityId ? `${prefix}/members?limit=200` : null,
  );

  const { data, pagination, loading, error, refetch, setPage } = useAdminList<Record<string, unknown>>({
    path: `${prefix}/finance/contracts/type/QARD_HASAN`,
    limit: 20,
  });

  const handleCreate = async () => {
    if (!form.title.trim() || !form.principalAmount) return;
    resetError();
    const result = await mutate(`${prefix}/finance/contracts`, {
      body: {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        contractType: 'QARD_HASAN',
        principalAmount: form.principalAmount,
        duration: parseInt(form.duration, 10),
        borrowerId: form.borrowerId || undefined,
      },
    });
    if (result) {
      setBanner({ type: 'success', message: 'Qard Hasan contract created.' });
      setForm({ title: '', description: '', principalAmount: '', borrowerId: '', duration: '12', purpose: '' });
      setShowCreate(false);
      refetch();
    } else {
      setBanner({ type: 'error', message: mutationError || 'Failed to create contract.' });
    }
  };

  const handleSubmitForReview = async (contractId: string) => {
    const result = await mutate(`${prefix}/finance/contracts/${contractId}/submit-review`, { method: 'POST', body: {} });
    if (result) {
      setBanner({ type: 'success', message: 'Submitted for Shariah review.' });
      refetch();
    } else {
      setBanner({ type: 'error', message: mutationError || 'Failed to submit for review.' });
    }
  };

  const handleRecordReview = async (contractId: string, status: 'REVIEWED' | 'NEEDS_REVISION') => {
    const result = await mutate(`${prefix}/finance/contracts/${contractId}/reviews`, {
      method: 'POST',
      body: { reviewer: 'Community Admin', status, comments: reviewComment.trim() || undefined },
    });
    if (result) {
      setBanner({ type: 'success', message: status === 'REVIEWED' ? 'Review approved. Contract is now ACTIVE.' : 'Review sent back for revision.' });
      setReviewingId(null);
      setReviewComment('');
      refetch();
    } else {
      setBanner({ type: 'error', message: mutationError || 'Failed to record review.' });
    }
  };

  const handleStartChat = async (userId: string) => {
    if (!communityId) return;
    try {
      const res = await fetch(`/api/v1/communities/${communityId}/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'DIRECT', memberIds: [userId] }),
      });
      const result = await res.json();
      if (result.data?.id) {
        navigate(`/community/messages?conversationId=${result.data.id}`);
      } else {
        navigate('/community/messages');
      }
    } catch {
      navigate('/community/messages');
    }
  };

  const columns = [
    { key: 'title', label: 'Contract', render: (item: Record<string, unknown>) => (
      <div>
        <p className="text-sm font-medium text-slate-900">{String(item.title)}</p>
        {item.description ? <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{String(item.description)}</p> : null}
      </div>
    )},
    { key: 'principalAmount', label: 'Principal', render: (item: Record<string, unknown>) => (
      <span className="text-sm font-medium text-slate-900">₹{String(item.principalAmount)}</span>
    )},
    { key: 'borrowerName', label: 'Borrower', render: (item: Record<string, unknown>) => (
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-600">{String(item.borrowerName || item.borrowerUserId || '-')}</span>
        {item.borrowerUserId ? (
          <button onClick={() => handleStartChat(String(item.borrowerUserId))} className="text-slate-400 hover:text-teal-600 transition-colors" title="Chat with borrower">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
          </button>
        ) : null}
      </div>
    )},
    { key: 'status', label: 'Status', render: (item: Record<string, unknown>) => <StatusBadge status={String(item.status)} /> },
    { key: 'shariahReviewStatus', label: 'Shariah', render: (item: Record<string, unknown>) => <StatusBadge status={String(item.shariahReviewStatus)} /> },
    { key: 'startDate', label: 'Start', render: (item: Record<string, unknown>) => (
      <span className="text-sm text-slate-500">{item.startDate ? new Date(String(item.startDate)).toLocaleDateString() : '-'}</span>
    )},
    { key: 'actions', label: 'Actions', render: (item: Record<string, unknown>) => {
      const status = String(item.status);
      const reviewStatus = String(item.shariahReviewStatus);
      const id = String(item.id);
      return (
        <div className="flex items-center gap-1.5">
          {status === 'DRAFT' && (
            <button onClick={() => handleSubmitForReview(id)} className="px-2 py-1 text-[11px] font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">Submit</button>
          )}
          {status === 'PENDING_REVIEW' && reviewStatus === 'PENDING_REVIEW' && reviewingId !== id && (
            <button onClick={() => setReviewingId(id)} className="px-2 py-1 text-[11px] font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">Review</button>
          )}
          {status === 'PENDING_REVIEW' && reviewingId === id && (
            <div className="flex items-center gap-1">
              <button onClick={() => handleRecordReview(id, 'REVIEWED')} className="px-2 py-1 text-[11px] font-medium text-white bg-green-600 rounded-lg hover:bg-green-700">Approve</button>
              <button onClick={() => handleRecordReview(id, 'NEEDS_REVISION')} className="px-2 py-1 text-[11px] font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600">Revise</button>
              <button onClick={() => { setReviewingId(null); setReviewComment(''); }} className="px-2 py-1 text-[11px] font-medium text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
            </div>
          )}
          {status === 'PENDING_REVIEW' && reviewingId === id && (
            <input value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Notes" className="w-24 px-2 py-1 text-[11px] border border-slate-200 rounded-lg" />
          )}
        </div>
      );
    }},
  ];

  return (
    <DashboardLayout title="Qard Hasan" navItems={communityNav} navTitle="Community">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {banner && (
          <div className={`rounded-2xl px-4 py-3 text-sm font-medium flex items-center gap-2 ${banner.type === 'success' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {banner.type === 'success' ? (
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            ) : (
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
            )}
            <span>{banner.message}</span>
            <button onClick={() => setBanner(null)} className="ml-auto opacity-60 hover:opacity-100">&times;</button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Qard Hasan (Interest-Free Loans)</h2>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? 'Cancel' : 'Create Loan'}</Button>
            <Button onClick={() => { refetch(); setLastRefresh(new Date()); }} variant="secondary">Refresh</Button>
          </div>
        </div>

        {showCreate && (
          <Card>
            <CardContent>
              <div className="space-y-4">
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Loan title" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} placeholder="Description (optional)" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
                <div className="grid grid-cols-2 gap-4">
                  <input value={form.principalAmount} onChange={(e) => setForm({ ...form, principalAmount: e.target.value })} placeholder="Principal amount (₹)" type="number" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
                  <select value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-2xl bg-white">
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="12">12 Months</option>
                    <option value="24">24 Months</option>
                  </select>
                </div>
                <select value={form.borrowerId} onChange={(e) => setForm({ ...form, borrowerId: e.target.value })} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-2xl bg-white">
                  <option value="">Select borrower...</option>
                  {(members || []).map((m) => (<option key={m.id} value={m.id}>{m.userName || m.userEmail}</option>))}
                </select>
                <input value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} placeholder="Purpose (optional)" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
                <div className="flex justify-end">
                  <Button onClick={handleCreate} loading={mutating}>Create Qard Hasan</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent>
            {loading && <LoadingState />}
            {error && <ErrorState message={error} onRetry={refetch} />}
            {!loading && !error && (
              <>
                <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No Qard Hasan contracts yet" />
                {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
              </>
            )}
          </CardContent>
        </Card>
        <div className="text-center"><span className="text-[10px] text-slate-400">Updated {lastRefresh.toLocaleTimeString()}</span></div>
      </div>
    </DashboardLayout>
  );
}
