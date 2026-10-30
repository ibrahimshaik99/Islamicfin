import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { communityNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useMutation } from '../../lib/useApi';
import { LoadingState, ErrorState, Button, Input, Select, Card, CardContent } from '../../components/ui';
import { useAdminList, DataTable, StatusBadge, Pagination } from '../../components/admin/AdminComponents';

export default function KametiPage() {
  const { communityId } = useAuth();
  const navigate = useNavigate();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', contributionAmount: '', frequency: 'MONTHLY', maxMembers: '10', startDate: '' });
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { mutate, loading: mutating, error: mutateError } = useMutation();

  const { data, pagination, loading, error, refetch, setPage } = useAdminList<Record<string, unknown>>({
    path: `${prefix}/kameti/groups`,
    limit: 20,
  });

  const handleCreate = async () => {
    if (!form.name.trim() || !form.contributionAmount || !form.startDate) return;
    const result = await mutate(`${prefix}/kameti/groups`, {
      body: {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        contributionAmount: form.contributionAmount,
        frequency: form.frequency,
        totalMembers: parseInt(form.maxMembers, 10),
        startDate: form.startDate,
      },
    });
    if (result === null) {
      // mutate() already surfaced the error via mutateError — keep the form open.
      return;
    }
    setActionMessage({ type: 'success', text: `Kameti group "${form.name.trim()}" created` });
    setTimeout(() => setActionMessage(null), 3000);
    setForm({ name: '', description: '', contributionAmount: '', frequency: 'MONTHLY', maxMembers: '10', startDate: '' });
    setShowCreate(false);
    refetch();
  };

  const columns = [
    { key: 'name', label: 'Name', render: (item: Record<string, unknown>) => (
      <span className="text-sm font-semibold text-ink">{String(item.name)}</span>
    )},
    { key: 'contributionAmount', label: 'Amount', render: (item: Record<string, unknown>) => (
      <span className="text-sm font-medium text-ink">₹{String(item.contributionAmount)}</span>
    )},
    { key: 'frequency', label: 'Frequency', render: (item: Record<string, unknown>) => (
      <span className="text-sm text-muted capitalize">{String(item.frequency).toLowerCase()}</span>
    )},
    { key: 'currentMembers', label: 'Members', render: (item: Record<string, unknown>) => (
      <span className="text-sm text-muted">{String(item.currentMembers)} / {String(item.totalMembers)}</span>
    )},
    { key: 'status', label: 'Status', render: (item: Record<string, unknown>) => <StatusBadge status={String(item.status)} /> },
    { key: 'startDate', label: 'Start', render: (item: Record<string, unknown>) => (
      <span className="text-sm text-muted">{new Date(String(item.startDate)).toLocaleDateString('en-IN')}</span>
    )},
    { key: 'actions', label: '', render: (item: Record<string, unknown>) => (
      <div className="flex gap-3">
        <button onClick={() => navigate(`/community/kameti/${String(item.id)}`)} className="text-xs text-primary-600 hover:text-primary-700 font-semibold">View Report</button>
        <button onClick={() => navigate(`/community/kameti/${String(item.id)}/chat`)} className="text-xs text-primary-600 hover:text-primary-700 font-semibold">Chat</button>
      </div>
    )},
  ];

  return (
    <DashboardLayout title="Kameti" navItems={communityNav} navTitle="Community">
      {actionMessage && (
        <div className={`mb-4 px-4 py-3 rounded-2xl text-sm font-medium border ${actionMessage.type === 'success' ? 'bg-primary-50 text-primary-800 border-primary-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
          {actionMessage.text}
        </div>
      )}
      {mutateError && (
        <div className="mb-4 px-4 py-3 rounded-2xl text-sm font-medium bg-red-50 text-red-800 border border-red-200">
          {mutateError}
        </div>
      )}
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Kameti Groups ({data.length})</h2>
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? 'Cancel' : 'Create Kameti'}</Button>
              <Button onClick={() => { refetch(); }} variant="secondary">Refresh</Button>
            </div>
          </div>
          {showCreate && (
            <Card>
              <CardContent>
                <div className="space-y-4">
                  <Input label="Group Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Monthly savings group" />
                  <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional" />
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Contribution Amount (₹)" value={form.contributionAmount} onChange={(e) => setForm({ ...form, contributionAmount: e.target.value })} placeholder="1000" />
                    <Select label="Frequency" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} options={[{ value: 'WEEKLY', label: 'Weekly' }, { value: 'BIWEEKLY', label: 'Bi-weekly' }, { value: 'MONTHLY', label: 'Monthly' }]} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Max Members" value={form.maxMembers} onChange={(e) => setForm({ ...form, maxMembers: e.target.value })} placeholder="10" type="number" />
                    <Input label="Start Date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} type="date" />
                  </div>
                  <div className="flex justify-end"><Button onClick={handleCreate} loading={mutating}>Create Kameti</Button></div>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent>
              <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No kameti groups yet" />
              {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
