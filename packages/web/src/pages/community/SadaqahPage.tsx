import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { communityNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useMutation } from '../../lib/useApi';
import { LoadingState, ErrorState, Button, Card, CardContent } from '../../components/ui';
import { useAdminList, DataTable, StatusBadge, Pagination } from '../../components/admin/AdminComponents';

export default function SadaqahPage() {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', goalAmount: '' });
  const [contributionTarget, setContributionTarget] = useState<{ id: string; title: string } | null>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionMethod, setContributionMethod] = useState('CASH');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { mutate, loading: mutating, error: mutationError, resetError } = useMutation();

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 4000);
    return () => clearTimeout(t);
  }, [banner]);

  const { data, pagination, loading, error, refetch, setPage } = useAdminList<Record<string, unknown>>({
    path: `${prefix}/crowdfunding/projects`,
    limit: 20,
  });

  const handleCreate = async () => {
    if (!form.title.trim() || !form.goalAmount) return;
    resetError();
    const result = await mutate(`${prefix}/crowdfunding/projects`, {
      body: {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        goalAmount: form.goalAmount,
        projectType: 'SADAQAH',
      },
    });
    if (result) {
      setBanner({ type: 'success', message: 'Sadaqah project created.' });
      setForm({ title: '', description: '', goalAmount: '' });
      setShowCreate(false);
      refetch();
    } else {
      setBanner({ type: 'error', message: mutationError || 'Failed to create project.' });
    }
  };

  const handleContribute = async () => {
    if (!contributionTarget || !contributionAmount) return;
    resetError();
    const result = await mutate(`${prefix}/crowdfunding/projects/${contributionTarget.id}/contributions`, {
      body: { amount: contributionAmount, paymentMethod: contributionMethod },
    });
    if (result) {
      setBanner({ type: 'success', message: 'Contribution recorded.' });
      setContributionTarget(null);
      setContributionAmount('');
      refetch();
    } else {
      setBanner({ type: 'error', message: mutationError || 'Failed to record contribution.' });
    }
  };

  const columns = [
    { key: 'title', label: 'Project' },
    { key: 'goalAmount', label: 'Goal', render: (item: Record<string, unknown>) => (
      <span className="text-sm font-medium text-slate-900">₹{String(item.goalAmount)}</span>
    )},
    { key: 'raisedAmount', label: 'Raised', render: (item: Record<string, unknown>) => {
      const raised = parseFloat(String(item.raisedAmount || '0'));
      const goal = parseFloat(String(item.goalAmount || '1'));
      const pct = goal > 0 ? Math.round((raised / goal) * 100) : 0;
      return (
        <div>
          <span className="text-sm font-medium text-teal-600">₹{String(item.raisedAmount || '0')}</span>
          <div className="h-1.5 bg-slate-100 rounded-full mt-1 w-24">
            <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <span className="text-[10px] text-slate-400">{pct}% funded</span>
        </div>
      );
    }},
    { key: 'status', label: 'Status', render: (item: Record<string, unknown>) => <StatusBadge status={String(item.status)} /> },
    { key: 'actions', label: '', render: (item: Record<string, unknown>) => (
      <div className="flex gap-2">
        {item.status === 'ACTIVE' && (
          <button onClick={() => setContributionTarget({ id: String(item.id), title: String(item.title) })}
            className="text-xs text-teal-600 hover:text-teal-700 font-medium">Contribute</button>
        )}
      </div>
    )},
  ];

  return (
    <DashboardLayout title="Sadaqah" navItems={communityNav} navTitle="Community">
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
          <h2 className="text-lg font-semibold text-slate-900">Sadaqah Projects</h2>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? 'Cancel' : 'Create Project'}</Button>
            <Button onClick={() => { refetch(); setLastRefresh(new Date()); }} variant="secondary">Refresh</Button>
          </div>
        </div>

        {showCreate && (
          <Card>
            <CardContent>
              <div className="space-y-4">
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Project title" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Description (optional)" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
                <input value={form.goalAmount} onChange={(e) => setForm({ ...form, goalAmount: e.target.value })} placeholder="Goal amount (₹)" type="number" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
                <div className="flex justify-end">
                  <Button onClick={handleCreate} loading={mutating}>Create Project</Button>
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
                <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No sadaqah projects yet" />
                {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
              </>
            )}
          </CardContent>
        </Card>
        <div className="text-center"><span className="text-[10px] text-slate-400">Updated {lastRefresh.toLocaleTimeString()}</span></div>
      </div>

      {contributionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Contribute to Sadaqah</h3>
            <p className="text-sm text-slate-500 mb-4">{contributionTarget.title}</p>
            <div className="space-y-3">
              <div className="flex gap-2">
                {['100', '250', '500', '1000'].map((amt) => (
                  <button key={amt} onClick={() => setContributionAmount(amt)} className={`px-3 py-1.5 text-sm rounded-2xl border ${contributionAmount === amt ? 'bg-teal-50 border-teal-500 text-teal-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>₹{amt}</button>
                ))}
              </div>
              <input value={contributionAmount} onChange={(e) => setContributionAmount(e.target.value)} placeholder="Custom amount (₹)" type="number" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-2xl bg-white focus:ring-2 focus:ring-teal-500 outline-none" />
              <select value={contributionMethod} onChange={(e) => setContributionMethod(e.target.value)} className="w-full px-3 py-2 text-sm border border-slate-200 rounded-2xl bg-white">
                <option value="CASH">Cash</option>
                <option value="UPI">UPI</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setContributionTarget(null); setContributionAmount(''); }} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-2xl hover:bg-slate-200">Cancel</button>
              <button onClick={handleContribute} disabled={mutating || !contributionAmount} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-2xl hover:bg-teal-700 disabled:opacity-50">
                {mutating ? 'Processing...' : 'Contribute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
