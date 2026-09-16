import { useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { adminNav } from '../../lib/navigation';
import { api } from '../../lib/api';
import { useAdminList, useAdminDetail, SearchInput, FilterSelect, Pagination, StatusBadge, DataTable, ConfirmDialog } from '../../components/admin/AdminComponents';
import { LoadingState, ErrorState, Card, CardContent, Button } from '../../components/ui';

/* ───── User Detail ───── */

export function UserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const { data, loading, error, refetch } = useAdminDetail<{ id: string; name: string; email: string; phone: string | null; status: string; lastLogin: string | null; createdAt: string; memberships: { communityId: string; role: string; status: string; joinedAt: string | null }[] }>({ path: `/admin/users/${userId}` });
  const [actionLoading, setActionLoading] = useState(false);
  const [confirm, setConfirm] = useState<'activate' | 'suspend' | 'disable' | null>(null);

  const handleStatusChange = async (newStatus: string) => {
    setActionLoading(true);
    try {
      await api(`/admin/users/${userId}/status`, { method: 'POST', body: { status: newStatus } });
      refetch();
    } catch { /* handled */ } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  };

  if (loading) return <DashboardLayout title="User" navItems={adminNav} navTitle="Admin"><LoadingState /></DashboardLayout>;
  if (error || !data) return <DashboardLayout title="User" navItems={adminNav} navTitle="Admin"><ErrorState message={error || 'Not found'} onRetry={refetch} /></DashboardLayout>;

  return (
    <DashboardLayout title={data.name} navItems={adminNav} navTitle="Admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">{data.name}</h2>
              <StatusBadge status={data.status} />
            </div>
            <p className="text-sm text-gray-500 mt-1">{data.email}</p>
          </div>
          <div className="flex gap-2">
            {data.status === 'ACTIVE' ? (
              <>
                <Button variant="danger" size="sm" onClick={() => setConfirm('suspend')}>Suspend</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirm('disable')}>Disable</Button>
              </>
            ) : (
              <Button variant="primary" size="sm" onClick={() => setConfirm('activate')}>Activate</Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Details</h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-gray-500">Email</dt><dd className="text-gray-900">{data.email}</dd></div>
              {data.phone && <div><dt className="text-gray-500">Phone</dt><dd className="text-gray-900">{data.phone}</dd></div>}
              <div><dt className="text-gray-500">Status</dt><dd><StatusBadge status={data.status} /></dd></div>
              <div><dt className="text-gray-500">Last Login</dt><dd className="text-gray-900">{data.lastLogin ? new Date(data.lastLogin).toLocaleString() : 'Never'}</dd></div>
              <div><dt className="text-gray-500">Joined</dt><dd className="text-gray-900">{new Date(data.createdAt).toLocaleDateString()}</dd></div>
            </dl>
          </CardContent>
        </Card>

        {data.memberships.length > 0 && (
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Community Memberships ({data.memberships.length})</h3>
              <div className="space-y-2">
                {data.memberships.map((m, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <Link to={`/admin/communities/${m.communityId}`} className="text-primary-600 hover:text-primary-700">{m.communityId.slice(0, 8)}...</Link>
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
        title={confirm === 'activate' ? 'Activate User' : confirm === 'suspend' ? 'Suspend User' : 'Disable User'}
        message={confirm === 'activate' ? `Activate "${data.name}"?` : confirm === 'suspend' ? `Suspend "${data.name}"? They will lose access.` : `Disable "${data.name}"? They will be completely blocked.`}
        confirmLabel={confirm === 'activate' ? 'Activate' : confirm === 'suspend' ? 'Suspend' : 'Disable'}
        loading={actionLoading}
        onConfirm={() => handleStatusChange(confirm === 'activate' ? 'ACTIVE' : confirm === 'suspend' ? 'SUSPENDED' : 'DISABLED')}
        onCancel={() => setConfirm(null)}
      />
    </DashboardLayout>
  );
}

/* ───── Users List ───── */

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { data, pagination, loading, error, refetch, setPage } = useAdminList<{ id: string; name: string; email: string; phone: string | null; status: string; lastLogin: string | null; createdAt: string }>({
    path: '/admin/users',
    search,
    filters: statusFilter ? { status: statusFilter } : {},
  });
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState(false);

  const handleManualRefresh = useCallback(() => {
    refetch();
    setLastRefreshed(new Date());
  }, [refetch]);

  const handleCreate = async () => {
    setCreateError('');
    if (!createName.trim() || !createEmail.trim() || !createPassword.trim()) {
      setCreateError('Name, email, and password are required.');
      return;
    }
    if (createPassword.length < 8) {
      setCreateError('Password must be at least 8 characters.');
      return;
    }
    setCreateLoading(true);
    try {
      await api('/admin/users', {
        method: 'POST',
        body: {
          name: createName.trim(),
          email: createEmail.trim(),
          password: createPassword,
          phone: createPhone.trim() || undefined,
        },
      });
      setCreateSuccess(true);
      setShowCreate(false);
      setCreateName('');
      setCreateEmail('');
      setCreatePassword('');
      setCreatePhone('');
      refetch();
      setTimeout(() => setCreateSuccess(false), 3000);
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : 'Failed to create user.');
    } finally {
      setCreateLoading(false);
    }
  };

  const columns = [
    {
      key: 'name', label: 'User',
      render: (item: { id: string; name: string; email: string; phone: string | null }) => (
        <div>
          <Link to={`/admin/users/${item.id}`} className="font-medium text-primary-600 hover:text-primary-700">{item.name}</Link>
          <p className="text-xs text-gray-500">{item.email}</p>
          {item.phone && <p className="text-xs text-gray-400">{item.phone}</p>}
        </div>
      ),
    },
    { key: 'status', label: 'Status', render: (item: { status: string }) => <StatusBadge status={item.status} /> },
    { key: 'lastLogin', label: 'Last Login', render: (item: { lastLogin: string | null }) => item.lastLogin ? new Date(item.lastLogin).toLocaleDateString() : <span className="text-gray-400">Never</span> },
    { key: 'createdAt', label: 'Joined', render: (item: { createdAt: string }) => new Date(item.createdAt).toLocaleDateString() },
  ];

  return (
    <DashboardLayout title="Users" navItems={adminNav} navTitle="Admin">
      <div className="space-y-4">
        {createSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">User created successfully.</div>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search users..." /></div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-400 hidden sm:block">Updated {lastRefreshed.toLocaleTimeString()}</span>
            <button
              onClick={handleManualRefresh}
              className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              title="Refresh"
            >
              ↻
            </button>
            <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>+ Create User</Button>
            <FilterSelect label="" value={statusFilter} onChange={setStatusFilter} options={[
              { value: '', label: 'All Status' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'SUSPENDED', label: 'Suspended' },
              { value: 'DISABLED', label: 'Disabled' },
            ]} />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100">
          <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No users found" onRetry={refetch} />
          {pagination && <div className="px-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Create User</h2>
            {createError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{createError}</div>}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={createName} onChange={(e) => setCreateName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Full name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="user@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="Min 8 characters" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                <input type="tel" value={createPhone} onChange={(e) => setCreatePhone(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none" placeholder="+91..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="ghost" size="sm" onClick={() => { setShowCreate(false); setCreateError(''); }}>Cancel</Button>
              <Button variant="primary" size="sm" onClick={handleCreate} loading={createLoading}>Create</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
