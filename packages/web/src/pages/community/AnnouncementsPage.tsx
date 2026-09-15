import { useState, useEffect, useRef, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { communityNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../lib/useApi';
import { usePermissions } from '../../lib/usePermissions';
import { LoadingState, ErrorState, Button, Card, CardContent } from '../../components/ui';
import { useAdminList, DataTable, StatusBadge, Pagination, ConfirmDialog } from '../../components/admin/AdminComponents';

export default function AnnouncementsPage() {
  const { communityId } = useAuth();
  const { hasPermission } = usePermissions();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [audience, setAudience] = useState('');
  const [targetGroups, setTargetGroups] = useState<string[]>([]);
  const [publishTarget, setPublishTarget] = useState<{ id: string; title: string } | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; title: string } | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout>>();
  const { mutate, loading: mutating, error: mutationError, resetError } = useMutation();

  const { data, pagination, loading, error, refetch, setPage } = useAdminList<Record<string, unknown>>({ path: `${prefix}/announcements`, limit: 20 });
  const { data: groups } = useApi<Record<string, unknown>[]>(communityId ? `${prefix}/groups?limit=100` : null);

  const showSuccess = useCallback((msg: string) => {
    setActionSuccess(msg);
    successTimer.current = setTimeout(() => setActionSuccess(null), 4000);
  }, []);

  useEffect(() => () => { if (successTimer.current) clearTimeout(successTimer.current); }, []);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) return;
    const result = await mutate(`${prefix}/announcements`, {
      body: { title: title.trim(), content: content.trim(), audience: audience.trim() || undefined },
    });
    if (result) {
      setTitle(''); setContent(''); setAudience(''); setTargetGroups([]);
      setShowCreate(false);
      showSuccess('Announcement created successfully');
      refetch();
    }
  };

  const handlePublish = async () => {
    if (!publishTarget) return;
    const result = await mutate(`${prefix}/announcements/${publishTarget.id}/publish`, { method: 'PATCH' });
    if (result !== null) {
      setPublishTarget(null);
      showSuccess('Announcement published');
      refetch();
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    const result = await mutate(`${prefix}/announcements/${archiveTarget.id}/archive`, { method: 'PATCH' });
    if (result !== null) {
      setArchiveTarget(null);
      showSuccess('Announcement archived');
      refetch();
    }
  };

  const toggleGroup = (groupId: string) => {
    setTargetGroups((prev) => prev.includes(groupId) ? prev.filter((g) => g !== groupId) : [...prev, groupId]);
  };

  const columns = [
    { key: 'title', label: 'Title', render: (item: Record<string, unknown>) => (
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center flex-shrink-0">
          <svg className="h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
          </svg>
        </div>
        <span className="text-sm font-medium text-slate-900">{String(item.title)}</span>
      </div>
    )},
    { key: 'content', label: 'Content', render: (item: Record<string, unknown>) => (
      <span className="text-sm text-slate-500 truncate max-w-[200px] block">{String(item.content || '')}</span>
    )},
    { key: 'audience', label: 'Audience', render: (item: Record<string, unknown>) => (
      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{String(item.audience || 'All')}</span>
    )},
    { key: 'status', label: 'Status', render: (item: Record<string, unknown>) => <StatusBadge status={String(item.status)} /> },
    { key: 'createdAt', label: 'Date', render: (item: Record<string, unknown>) => (
      <span className="text-sm text-slate-500">{item.createdAt ? new Date(String(item.createdAt)).toLocaleDateString() : '-'}</span>
    )},
    { key: 'actions', label: '', render: (item: Record<string, unknown>) => (
      <div className="flex gap-2">
        {hasPermission('community:announcements:publish') && item.status === 'DRAFT' && (
          <button onClick={() => setPublishTarget({ id: String(item.id), title: String(item.title) })} className="text-xs text-green-600 hover:text-green-700 font-medium">Publish</button>
        )}
        {hasPermission('community:announcements:publish') && item.status === 'PUBLISHED' && (
          <button onClick={() => setArchiveTarget({ id: String(item.id), title: String(item.title) })} className="text-xs text-slate-500 hover:text-slate-700 font-medium">Archive</button>
        )}
      </div>
    )},
  ];

  return (
    <DashboardLayout title="Announcements" navItems={communityNav} navTitle="Community">
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
            <h2 className="text-lg font-semibold text-slate-900">Announcements</h2>
            <div className="flex items-center gap-2">
              {hasPermission('community:announcements:create') && (
                <Button onClick={() => setShowCreate(!showCreate)}>{showCreate ? 'Cancel' : 'Create Announcement'}</Button>
              )}
              <Button onClick={() => refetch()} variant="secondary">Refresh</Button>
            </div>
          </div>
          {showCreate && (
            <Card>
              <CardContent>
                <div className="space-y-4">
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" />
                  <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Write your announcement..." />
                  <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Audience (optional, e.g. All members)" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none" />
                  {groups && groups.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Send to Groups (multi-select)</label>
                      <div className="flex flex-wrap gap-2">
                        {groups.map((g) => (
                          <button key={String(g.id)} onClick={() => toggleGroup(String(g.id))}
                            className={`px-3 py-1 text-xs rounded-full border ${targetGroups.includes(String(g.id)) ? 'bg-teal-50 border-teal-500 text-teal-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                            {String(g.name)}
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Leave empty to send to all members</p>
                    </div>
                  )}
                  <div className="flex justify-end"><Button onClick={handleCreate} loading={mutating}>Create</Button></div>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent>
              <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No announcements yet" />
              {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
            </CardContent>
          </Card>
        </div>
      )}
      <ConfirmDialog open={!!publishTarget} title="Publish Announcement" message={`Publish "${publishTarget?.title}"? This will notify all selected groups/members.`} confirmLabel="Publish" onConfirm={handlePublish} onCancel={() => setPublishTarget(null)} loading={mutating} />
      <ConfirmDialog open={!!archiveTarget} title="Archive Announcement" message={`Archive "${archiveTarget?.title}"?`} confirmLabel="Archive" onConfirm={handleArchive} onCancel={() => setArchiveTarget(null)} loading={mutating} />
    </DashboardLayout>
  );
}