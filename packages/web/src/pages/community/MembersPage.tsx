import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { communityNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { useMutation } from '../../lib/useApi';
import { usePermissions } from '../../lib/usePermissions';
import { StatCard, LoadingState, ErrorState, Button, Card, CardContent } from '../../components/ui';
import { useAdminList, DataTable, StatusBadge, Pagination, ConfirmDialog, SearchInput } from '../../components/admin/AdminComponents';

interface MembershipRequest {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  status: string;
  type: string;
  createdAt: string;
  communityId?: string;
}

const ROLE_OPTIONS = ['COMMUNITY_OWNER', 'COMMUNITY_ADMIN', 'COMMUNITY_FINANCE_MANAGER', 'COMMUNITY_MODERATOR', 'MERCHANT', 'MERCHANT_STAFF', 'CUSTOMER'] as const;

export default function MembersPage() {
  const { communityId } = useAuth();
  const { hasPermission } = usePermissions();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [roleTarget, setRoleTarget] = useState<{ id: string; currentRole: string; name: string } | null>(null);
  const [newRole, setNewRole] = useState('');
  const [suspendTarget, setSuspendTarget] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [pendingRequests, setPendingRequests] = useState<MembershipRequest[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { mutate, loading: mutating } = useMutation();

  const { data, pagination, loading, error, refetch, setPage, setSearch: setServerSearch } = useAdminList<Record<string, unknown>>({
    path: `${prefix}/members`,
    limit: 20,
  });

  const showBanner = useCallback((type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 3000);
  }, []);

  const fetchPendingRequests = useCallback(async () => {
    setPendingLoading(true);
    setPendingError(null);
    try {
      const res = await api<{ data: MembershipRequest[]; pagination: { total: number } }>(
        `/membership-requests?status=PENDING&type=JOIN_COMMUNITY&limit=100`,
      );
      setPendingRequests(res.data ?? []);
    } catch {
      setPendingError('Failed to load pending requests');
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  const handleRefresh = () => {
    refetch();
    fetchPendingRequests();
    setLastRefresh(new Date());
  };

  const handleSearch = (v: string) => {
    setSearch(v);
    setServerSearch(v);
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      await api(`/membership-requests/${requestId}/approve`, { method: 'POST' });
      showBanner('success', 'Member request approved');
      fetchPendingRequests();
      refetch();
    } catch {
      showBanner('error', 'Failed to approve request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await api(`/membership-requests/${requestId}/reject`, { method: 'POST' });
      showBanner('success', 'Member request rejected');
      fetchPendingRequests();
    } catch {
      showBanner('error', 'Failed to reject request');
    }
  };

  const handleRoleChange = async () => {
    if (!roleTarget || !newRole || newRole === roleTarget.currentRole) return;
    try {
      await mutate(`${prefix}/members/${roleTarget.id}/role`, { method: 'PATCH', body: { role: newRole } });
      showBanner('success', 'Role updated');
      setRoleTarget(null);
      setNewRole('');
      refetch();
    } catch {
      showBanner('error', 'Failed to update role');
    }
  };

  const handleSuspend = async () => {
    if (!suspendTarget) return;
    try {
      await mutate(`${prefix}/members/${suspendTarget.id}/role`, {
        method: 'PATCH',
        body: { role: 'CUSTOMER', status: 'SUSPENDED' },
      });
      showBanner('success', 'Member suspended');
      setSuspendTarget(null);
      refetch();
    } catch {
      showBanner('error', 'Failed to suspend member');
    }
  };

  const filteredMembers = data.filter((m) => m.role !== 'SUPER_ADMIN');
  const activeCount = filteredMembers.filter((m) => m.status === 'ACTIVE').length;

  const requestColumns = [
    {
      key: 'userName',
      label: 'Requester',
      render: (item: Record<string, unknown>) => {
        const name = String(item.userName || '');
        const email = String(item.userEmail || item.userId || '');
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-teal-700">{(name || email).slice(0, 2).toUpperCase()}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">{name || 'Unknown'}</p>
              <p className="text-xs text-slate-500">{email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'createdAt',
      label: 'Requested',
      render: (item: Record<string, unknown>) => (
        <span className="text-sm text-slate-500">
          {item.createdAt ? new Date(String(item.createdAt)).toLocaleDateString() : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (item: Record<string, unknown>) => (
        <div className="flex gap-2">
          {hasPermission('member:manage') && (
            <>
              <Button variant="primary" size="sm" onClick={() => handleApproveRequest(String(item.id))}>
                Approve
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleRejectRequest(String(item.id))}>
                Reject
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  const memberColumns = [
    {
      key: 'userName',
      label: 'Member',
      render: (item: Record<string, unknown>) => {
        const name = String(item.userName || '');
        const email = String(item.userEmail || item.userId || '');
        return (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-teal-700">{(name || email).slice(0, 2).toUpperCase()}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">{name || 'Unknown'}</p>
              <p className="text-xs text-slate-500">{email}</p>
            </div>
          </div>
        );
      },
    },
    { key: 'role', label: 'Role', render: (item: Record<string, unknown>) => <StatusBadge status={String(item.role)} /> },
    { key: 'status', label: 'Status', render: (item: Record<string, unknown>) => <StatusBadge status={String(item.status)} /> },
    {
      key: 'joinedAt',
      label: 'Joined',
      render: (item: Record<string, unknown>) => (
        <span className="text-sm text-slate-500">
          {item.joinedAt ? new Date(String(item.joinedAt)).toLocaleDateString() : '-'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (item: Record<string, unknown>) => (
        <div className="flex gap-2">
          {hasPermission('community:members:update_role') && (
            <button
              onClick={() => {
                setRoleTarget({
                  id: String(item.id),
                  currentRole: String(item.role),
                  name: String(item.userName || item.userId).slice(0, 8),
                });
                setNewRole(String(item.role));
              }}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium"
            >
              Change Role
            </button>
          )}
          {hasPermission('community:members:remove') && item.status !== 'SUSPENDED' && (
            <button
              onClick={() =>
                setSuspendTarget({
                  id: String(item.id),
                  name: String(item.userName || item.userId).slice(0, 8),
                })
              }
              className="text-xs text-red-600 hover:text-red-700 font-medium"
            >
              Suspend
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Members" navItems={communityNav} navTitle="Community">
      {loading && !error && <LoadingState />}

      {banner && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all duration-300 ${
            banner.type === 'success'
              ? 'bg-teal-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {banner.message}
        </div>
      )}

      {!loading && error && <ErrorState message={error} onRetry={handleRefresh} />}

      {!loading && !error && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
              <StatCard label="Total Members" value={filteredMembers.length} color="blue" />
              <StatCard label="Active Members" value={activeCount} color="green" />
              <StatCard label="Pending Requests" value={pendingRequests.length} color="orange" />
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Button onClick={handleRefresh} variant="secondary" loading={pendingLoading}>
                Refresh
              </Button>
              <span className="text-[10px] text-slate-400">{lastRefresh.toLocaleTimeString()}</span>
            </div>
          </div>

          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-slate-900 mb-4">
                Pending Join Requests ({pendingRequests.length})
              </h3>
              {pendingLoading && <LoadingState message="Loading requests..." />}
              {pendingError && <ErrorState message={pendingError} onRetry={fetchPendingRequests} />}
              {!pendingLoading && !pendingError && pendingRequests.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">No pending join requests</p>
              )}
              {!pendingLoading && !pendingError && pendingRequests.length > 0 && (
                <DataTable
                  columns={requestColumns}
                  data={pendingRequests.map((r) => ({ ...r } as Record<string, unknown>))}
                  loading={pendingLoading}
                  error={pendingError}
                  emptyMessage="No pending requests"
                  onRetry={fetchPendingRequests}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Community Members</h3>
                <SearchInput value={search} onChange={handleSearch} placeholder="Search members..." />
              </div>
              <DataTable
                columns={memberColumns}
                data={filteredMembers}
                loading={loading}
                error={error}
                emptyMessage="No members found"
                onRetry={handleRefresh}
              />
              {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
            </CardContent>
          </Card>
        </div>
      )}

      {roleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Change Member Role</h3>
            <p className="text-sm text-slate-500 mb-4">Member: {roleTarget.name}...</p>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setRoleTarget(null); setNewRole(''); }}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRoleChange}
                disabled={mutating || newRole === roleTarget.currentRole}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50"
              >
                {mutating ? 'Updating...' : 'Update Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!suspendTarget}
        title="Suspend Member"
        message={`Suspend member ${suspendTarget?.name}? This will remove their community access.`}
        confirmLabel="Suspend"
        onConfirm={handleSuspend}
        onCancel={() => setSuspendTarget(null)}
        loading={mutating}
      />
    </DashboardLayout>
  );
}
