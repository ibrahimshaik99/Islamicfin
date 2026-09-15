import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { adminNav } from '../../lib/navigation';
import { api } from '../../lib/api';
import { useAdminList, useAdminDetail, SearchInput, FilterSelect, Pagination, StatusBadge, DataTable, ConfirmDialog } from '../../components/admin/AdminComponents';
import { LoadingState, ErrorState, Card, CardContent, Button } from '../../components/ui';

/* ───── Community Detail ───── */

export function CommunityDetail() {
  const { communityId } = useParams<{ communityId: string }>();
  const { data, loading, error, refetch } = useAdminDetail<{ id: string; name: string; slug: string; description: string | null; status: string; createdAt: string; members: { id: string; userId: string; role: string; status: string; joinedAt: string | null }[]; subscription: { plan: string; price: string; currency: string; status: string; expiresAt: string | null } | null }>({ path: `/admin/communities/${communityId}` });
  const [actionLoading, setActionLoading] = useState(false);
  const [confirm, setConfirm] = useState<'activate' | 'suspend' | null>(null);

  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(true);
    try {
      await api(`/admin/communities/${communityId}/status`, { method: 'POST', body: { status: newStatus } });
      refetch();
    } catch {
      // handled by UI
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  };

  if (loading) return <DashboardLayout title="Community" navItems={adminNav} navTitle="Admin"><LoadingState /></DashboardLayout>;
  if (error || !data) return <DashboardLayout title="Community" navItems={adminNav} navTitle="Admin"><ErrorState message={error || 'Not found'} onRetry={refetch} /></DashboardLayout>;

  return (
    <DashboardLayout title={data.name} navItems={adminNav} navTitle="Admin">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">{data.name}</h2>
              <StatusBadge status={data.status} />
            </div>
            <p className="text-sm text-gray-500 mt-1">/{data.slug}</p>
          </div>
          <div className="flex gap-2">
            {data.status === 'ACTIVE' ? (
              <Button variant="danger" size="sm" onClick={() => setConfirm('suspend')}>Suspend</Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => setConfirm('activate')}>Activate</Button>
            )}
          </div>
        </div>

        {data.description && (
          <Card><CardContent><p className="text-sm text-gray-600">{data.description}</p></CardContent></Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Details</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-gray-500">Created</dt><dd className="text-gray-900">{new Date(data.createdAt).toLocaleDateString()}</dd></div>
                <div className="flex justify-between"><dt className="text-gray-500">Members</dt><dd className="text-gray-900">{data.members.length}</dd></div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Subscription</h3>
              {data.subscription ? (
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between"><dt className="text-gray-500">Plan</dt><dd className="text-gray-900">{data.subscription.plan}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Price</dt><dd className="text-gray-900">{data.subscription.currency} {data.subscription.price}</dd></div>
                  <div className="flex justify-between"><dt className="text-gray-500">Status</dt><dd><StatusBadge status={data.subscription.status} /></dd></div>
                  {data.subscription.expiresAt && (
                    <div className="flex justify-between"><dt className="text-gray-500">Expires</dt><dd className="text-gray-900">{new Date(data.subscription.expiresAt).toLocaleDateString()}</dd></div>
                  )}
                </dl>
              ) : (
                <p className="text-sm text-gray-500">No active subscription</p>
              )}
            </CardContent>
          </Card>
        </div>

        {data.members.length > 0 && (
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Members ({data.members.length})</h3>
              <div className="space-y-2">
                {data.members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-sm py-2 border-b border-slate-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-900">{m.role.replace(/_/g, ' ')}</span>
                      <StatusBadge status={m.status} />
                    </div>
                    {m.joinedAt && <span className="text-xs text-gray-400">{new Date(m.joinedAt).toLocaleDateString()}</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm === 'suspend' ? 'Suspend Community' : 'Activate Community'}
        message={confirm === 'suspend' ? `Are you sure you want to suspend "${data.name}"? Members will lose access.` : `Activate "${data.name}"? Members will regain access.`}
        confirmLabel={confirm === 'suspend' ? 'Suspend' : 'Activate'}
        loading={actionLoading}
        onConfirm={() => handleStatusChange(confirm === 'suspend' ? 'SUSPENDED' : 'ACTIVE')}
        onCancel={() => setConfirm(null)}
      />
    </DashboardLayout>
  );
}

/* ───── Communities List ───── */

interface CommunityItem {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  [key: string]: unknown;
}

export default function CommunitiesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { data, pagination, loading, error, refetch, setPage } = useAdminList<CommunityItem>({
    path: '/admin/communities',
    search,
    filters: statusFilter ? { status: statusFilter } : {},
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; action: 'activate' | 'suspend'; name: string } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', slug: '', description: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
      setLastRefreshed(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  const handleManualRefresh = useCallback(() => {
    refetch();
    setLastRefreshed(new Date());
  }, [refetch]);

  const handleStatusChange = async (communityId: string, newStatus: string) => {
    setActionLoading(communityId);
    try {
      await api(`/admin/communities/${communityId}/status`, { method: 'POST', body: { status: newStatus } });
      refetch();
    } catch {
      // handled by UI
    } finally {
      setActionLoading(null);
      setConfirm(null);
    }
  };

  const handleCreate = async () => {
    setCreateLoading(true);
    setCreateError('');
    try {
      await api('/admin/communities', {
        method: 'POST',
        body: {
          name: createForm.name,
          slug: createForm.slug.toLowerCase().replace(/\s+/g, '-'),
          description: createForm.description || undefined,
        },
      });
      setShowCreateForm(false);
      setCreateForm({ name: '', slug: '', description: '' });
      refetch();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create community');
    } finally {
      setCreateLoading(false);
    }
  };

  const columns = [
    {
      key: 'name', label: 'Community',
      render: (item: CommunityItem) => (
        <Link to={`/admin/communities/${item.id}`} className="font-medium text-primary-600 hover:text-primary-700">{item.name}</Link>
      ),
    },
    { key: 'slug', label: 'Slug', render: (item: CommunityItem) => <span className="text-gray-500">/{item.slug}</span> },
    { key: 'status', label: 'Status', render: (item: CommunityItem) => <StatusBadge status={item.status} /> },
    { key: 'createdAt', label: 'Created', render: (item: CommunityItem) => new Date(item.createdAt).toLocaleDateString() },
    {
      key: 'actions', label: '', className: 'text-right',
      render: (item: CommunityItem) => (
        <div className="flex items-center justify-end gap-2">
          {item.status === 'ACTIVE' ? (
            <button
              onClick={() => setConfirm({ id: item.id, action: 'suspend', name: item.name })}
              disabled={actionLoading === item.id}
              className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50 px-2 py-1 rounded hover:bg-red-50 transition-colors"
            >
              {actionLoading === item.id ? '...' : 'Suspend'}
            </button>
          ) : (
            <button
              onClick={() => setConfirm({ id: item.id, action: 'activate', name: item.name })}
              disabled={actionLoading === item.id}
              className="text-xs font-medium text-green-600 hover:text-green-700 disabled:opacity-50 px-2 py-1 rounded hover:bg-green-50 transition-colors"
            >
              {actionLoading === item.id ? '...' : 'Activate'}
            </button>
          )}
          <Link
            to={`/admin/communities/${item.id}`}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 px-2 py-1 rounded hover:bg-primary-50 transition-colors"
          >
            View
          </Link>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Communities" navItems={adminNav} navTitle="Admin">
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search communities..." /></div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-400 hidden sm:block">Updated {lastRefreshed.toLocaleTimeString()}</span>
            <button
              onClick={handleManualRefresh}
              className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              title="Refresh"
            >
              ↻
            </button>
            <FilterSelect label="" value={statusFilter} onChange={setStatusFilter} options={[
              { value: '', label: 'All Status' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'SUSPENDED', label: 'Suspended' },
            ]} />
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap"
            >
              + Create Community
            </button>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100">
          <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No communities found" onRetry={refetch} />
          {pagination && <div className="px-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>}
        </div>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.action === 'suspend' ? 'Suspend Community' : 'Activate Community'}
        message={confirm?.action === 'suspend' ? `Suspend "${confirm?.name}"? Members will lose access.` : `Activate "${confirm?.name}"? Members will regain access.`}
        confirmLabel={confirm?.action === 'suspend' ? 'Suspend' : 'Activate'}
        loading={actionLoading !== null}
        onConfirm={() => confirm && handleStatusChange(confirm.id, confirm.action === 'suspend' ? 'SUSPENDED' : 'ACTIVE')}
        onCancel={() => setConfirm(null)}
      />

      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreateForm(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Community</h3>
            {createError && <p className="text-sm text-red-600 mb-3">{createError}</p>}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                <input type="text" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Community name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Slug</label>
                <input type="text" value={createForm.slug} onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="community-slug" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Description (optional)</label>
                <textarea value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} placeholder="Brief description..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none" rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateForm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={!createForm.name || !createForm.slug || createLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {createLoading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
