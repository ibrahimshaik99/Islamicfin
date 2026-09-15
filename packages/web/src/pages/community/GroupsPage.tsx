import { useState, useEffect, useRef, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { communityNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../lib/useApi';
import { usePermissions } from '../../lib/usePermissions';
import { LoadingState, ErrorState, Button, Input, Select, Card, CardContent } from '../../components/ui';
import { useAdminList, DataTable, StatusBadge, Pagination, ConfirmDialog } from '../../components/admin/AdminComponents';

const MEMBER_SIZE_OPTIONS = [
  { value: '12', label: '12 Members (Standard)' },
  { value: '16', label: '16 Members (Medium)' },
  { value: '24', label: '24 Members (Large)' },
  { value: '10', label: '10 Members (Small)' },
  { value: '20', label: '20 Members' },
  { value: '30', label: '30 Members (Extra Large)' },
];

interface GroupMember { id: string; userId: string; status: string; joinedAt: string; userName: string | null; userEmail: string | null; }

export default function GroupsPage() {
  const { communityId } = useAuth();
  const { hasPermission } = usePermissions();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', maxMembers: '12' });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [memberTarget, setMemberTarget] = useState<{ id: string; name: string } | null>(null);
  const [addMemberId, setAddMemberId] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout>>();
  const { mutate, loading: mutating, error: mutationError, resetError } = useMutation();

  const { data, pagination, loading, error, refetch, setPage } = useAdminList<Record<string, unknown>>({ path: `${prefix}/groups`, limit: 20 });
  const { data: groupMembers, loading: membersLoading, refetch: refetchMembers } = useApi<GroupMember[]>(
    communityId && memberTarget ? `${prefix}/groups/${memberTarget.id}/members` : null,
  );

  const showSuccess = useCallback((msg: string) => {
    setActionSuccess(msg);
    successTimer.current = setTimeout(() => setActionSuccess(null), 4000);
  }, []);

  useEffect(() => () => { if (successTimer.current) clearTimeout(successTimer.current); }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    const result = await mutate(`${prefix}/groups`, {
      body: { name: form.name.trim(), description: form.description.trim() || undefined, maxMembers: parseInt(form.maxMembers, 10) },
    });
    if (result) {
      setForm({ name: '', description: '', maxMembers: '12' });
      setShowCreate(false);
      showSuccess('Group created successfully');
      refetch();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const result = await mutate(`${prefix}/groups/${deleteTarget.id}`, { method: 'DELETE' });
    if (result !== null) {
      setDeleteTarget(null);
      showSuccess('Group deleted');
      refetch();
    }
  };

  const handleAddMember = async () => {
    if (!memberTarget || !addMemberId.trim()) return;
    const result = await mutate(`${prefix}/groups/${memberTarget.id}/members`, { body: { userId: addMemberId.trim() } });
    if (result) {
      setAddMemberId('');
      showSuccess('Member added');
      refetchMembers();
      refetch();
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!memberTarget) return;
    const result = await mutate(`${prefix}/groups/${memberTarget.id}/members/${memberId}`, { method: 'DELETE' });
    if (result !== null) {
      showSuccess('Member removed');
      refetchMembers();
      refetch();
    }
  };

  const columns = [
    { key: 'name', label: 'Name', render: (item: Record<string, unknown>) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
          <svg className="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        </div>
        <span className="text-sm font-medium text-slate-900">{String(item.name)}</span>
      </div>
    )},
    { key: 'description', label: 'Description', render: (item: Record<string, unknown>) => (
      <span className="text-sm text-slate-500 truncate max-w-[200px] block">{String(item.description || '-')}</span>
    )},
    { key: 'memberCount', label: 'Members', render: (item: Record<string, unknown>) => (
      <span className="text-sm text-slate-600">{String(item.memberCount ?? 0)} / {String(item.maxMembers || '?')}</span>
    )},
    { key: 'status', label: 'Status', render: (item: Record<string, unknown>) => <StatusBadge status={String(item.status)} /> },
    { key: 'createdAt', label: 'Created', render: (item: Record<string, unknown>) => (
      <span className="text-sm text-slate-500">{new Date(String(item.createdAt)).toLocaleDateString()}</span>
    )},
    { key: 'actions', label: '', render: (item: Record<string, unknown>) => (
      <div className="flex gap-2">
        {hasPermission('member:manage') && (
          <button onClick={() => setMemberTarget({ id: String(item.id), name: String(item.name) })} className="text-xs text-teal-600 hover:text-teal-700 font-medium">Members</button>
        )}
        {hasPermission('kameti:manage') && (
          <button onClick={() => setDeleteTarget({ id: String(item.id), name: String(item.name) })} className="text-xs text-red-600 hover:text-red-700 font-medium">Delete</button>
        )}
      </div>
    )},
  ];

  return (
    <DashboardLayout title="Groups" navItems={communityNav} navTitle="Community">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {actionSuccess && (
            <div className="rounded-2xl bg-teal-50 border border-teal-200 px-4 py-3 text-sm text-teal-700 flex items-center justify-between">
              <span>{actionSuccess}</span>
              <button onClick={() => setActionSuccess(null)} className="text-teal-500 hover:text-teal-700">&times;</button>
            </div>
          )}
          {mutationError && (
            <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
              <span>{mutationError}</span>
              <button onClick={resetError} className="text-red-500 hover:text-red-700">&times;</button>
            </div>
          )}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Community Groups</h2>
            <div className="flex items-center gap-2">
              {hasPermission('kameti:manage') && (
                <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? 'Cancel' : 'Create Group'}</Button>
              )}
              <Button onClick={() => refetch()} variant="secondary">Refresh</Button>
            </div>
          </div>
          {showCreate && (
            <Card>
              <CardContent>
                <div className="space-y-4">
                  <Input label="Group Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter group name" />
                  <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
                  <Select label="Max Group Size" value={form.maxMembers} onChange={(e) => setForm({ ...form, maxMembers: e.target.value })} options={MEMBER_SIZE_OPTIONS} />
                  <div className="flex justify-end"><Button onClick={handleCreate} loading={mutating}>Create Group</Button></div>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent>
              <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No groups yet" />
              {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
            </CardContent>
          </Card>
        </div>
      )}
      {memberTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[80vh] flex flex-col">
            <h3 className="text-lg font-semibold text-slate-900 mb-1">Group Members</h3>
            <p className="text-sm text-slate-500 mb-4">{memberTarget.name}</p>
            <div className="flex gap-2 mb-4">
              <input value={addMemberId} onChange={(e) => setAddMemberId(e.target.value)} placeholder="Enter user ID to add" className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" />
              <button onClick={handleAddMember} disabled={mutating || !addMemberId.trim()} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50">Add</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {membersLoading && <LoadingState />}
              {!membersLoading && (!groupMembers || groupMembers.length === 0) && <p className="text-sm text-slate-500 text-center py-4">No members yet.</p>}
              <div className="space-y-2">
                {(groupMembers || []).map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{m.userName || 'Unknown'}</p>
                      <p className="text-xs text-slate-500">{m.userEmail || m.userId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={m.status} />
                      {m.status === 'ACTIVE' && (
                        <button onClick={() => handleRemoveMember(m.id)} className="text-xs text-red-600 hover:text-red-700">Remove</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end mt-4 pt-4 border-t border-slate-100">
              <button onClick={() => { setMemberTarget(null); setAddMemberId(''); }} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200">Close</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog open={!!deleteTarget} title="Delete Group" message={`Delete "${deleteTarget?.name}"?`} confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={mutating} />
    </DashboardLayout>
  );
}
