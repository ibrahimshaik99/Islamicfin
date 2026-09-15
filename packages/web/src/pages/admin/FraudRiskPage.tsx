import { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { adminNav } from '../../lib/navigation';
import { api } from '../../lib/api';
import { useAdminList, FilterSelect, Pagination, StatusBadge, DataTable, ConfirmDialog } from '../../components/admin/AdminComponents';
import { Card, CardContent, Button } from '../../components/ui';
import type { RiskFlag } from '../../lib/types';

export default function FraudRiskPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const { data, pagination, loading, error, refetch, setPage } = useAdminList<RiskFlag>({
    path: '/admin/fraud/flags',
    filters: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(severityFilter ? { severity: severityFilter } : {}),
    },
  });

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: string; label: string } | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ entityType: '', entityId: '', severity: 'LOW', reason: '', communityId: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [showNotesForm, setShowNotesForm] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const handleStatusUpdate = async (flagId: string, status: string, noteText?: string) => {
    setActionLoading(flagId);
    try {
      const body: Record<string, string> = { status };
      if (noteText) body.notes = noteText;
      await api(`/admin/fraud/flags/${flagId}`, { method: 'PATCH', body });
      refetch();
    } catch { /* handled */ } finally {
      setActionLoading(null);
      setConfirmAction(null);
      setShowNotesForm(null);
      setNotes('');
    }
  };

  const handleCreate = async () => {
    setCreateLoading(true);
    try {
      await api('/admin/fraud/flags', {
        method: 'POST',
        body: {
          entityType: createForm.entityType,
          entityId: createForm.entityId,
          severity: createForm.severity,
          reason: createForm.reason,
          communityId: createForm.communityId || undefined,
        },
      });
      setShowCreateForm(false);
      setCreateForm({ entityType: '', entityId: '', severity: 'LOW', reason: '', communityId: '' });
      refetch();
    } catch { /* handled */ } finally {
      setCreateLoading(false);
    }
  };

  const columns = [
    {
      key: 'severity', label: 'Severity',
      render: (item: RiskFlag) => <StatusBadge status={item.severity} />,
    },
    {
      key: 'entityType', label: 'Entity',
      render: (item: RiskFlag) => (
        <div>
          <span className="text-gray-900 capitalize">{item.entityType}</span>
          <p className="text-xs text-gray-400 font-mono">{item.entityId.slice(0, 8)}...</p>
        </div>
      ),
    },
    { key: 'reason', label: 'Reason', render: (item: RiskFlag) => <span className="text-sm text-gray-600 truncate max-w-[200px] block">{item.reason}</span> },
    { key: 'status', label: 'Status', render: (item: RiskFlag) => <StatusBadge status={item.status} /> },
    {
      key: 'createdAt', label: 'Created',
      render: (item: RiskFlag) => <span className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</span>,
    },
    {
      key: 'actions', label: '', className: 'text-right',
      render: (item: RiskFlag) => (
        <div className="flex items-center justify-end gap-1">
          {item.status === 'FLAGGED' && (
            <button
              onClick={() => setConfirmAction({ id: item.id, action: 'UNDER_REVIEW', label: 'Start Review' })}
              disabled={actionLoading === item.id}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
            >
              Review
            </button>
          )}
          {(item.status === 'FLAGGED' || item.status === 'UNDER_REVIEW') && (
            <>
              <button
                onClick={() => setShowNotesForm(item.id)}
                disabled={actionLoading === item.id}
                className="text-xs font-medium text-green-600 hover:text-green-700 disabled:opacity-50 px-2 py-1 rounded hover:bg-green-50 transition-colors"
              >
                Resolve
              </button>
              <button
                onClick={() => setConfirmAction({ id: item.id, action: 'DISMISSED', label: 'Dismiss' })}
                disabled={actionLoading === item.id}
                className="text-xs font-medium text-gray-500 hover:text-gray-700 disabled:opacity-50 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
              >
                Dismiss
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Fraud & Risk" navItems={adminNav} navTitle="Admin">
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card><CardContent>
              <p className="text-xs text-gray-500 font-medium">Total Flags</p>
              <p className="text-xl font-bold text-gray-900">{pagination?.total ?? data.length}</p>
            </CardContent></Card>
            <Card><CardContent>
              <p className="text-xs text-yellow-600 font-medium">Flagged</p>
              <p className="text-xl font-bold text-yellow-700">{data.filter((f) => f.status === 'FLAGGED').length}</p>
            </CardContent></Card>
            <Card><CardContent>
              <p className="text-xs text-orange-600 font-medium">Under Review</p>
              <p className="text-xl font-bold text-orange-700">{data.filter((f) => f.status === 'UNDER_REVIEW').length}</p>
            </CardContent></Card>
            <Card><CardContent>
              <p className="text-xs text-green-600 font-medium">Resolved</p>
              <p className="text-xl font-bold text-green-700">{data.filter((f) => f.status === 'CONFIRMED' || f.status === 'DISMISSED').length}</p>
            </CardContent></Card>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowCreateForm(true)}>Create Flag</Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-end">
          <FilterSelect label="" value={statusFilter} onChange={setStatusFilter} options={[
            { value: '', label: 'All Status' },
            { value: 'FLAGGED', label: 'Flagged' },
            { value: 'UNDER_REVIEW', label: 'Under Review' },
            { value: 'CONFIRMED', label: 'Confirmed' },
            { value: 'DISMISSED', label: 'Dismissed' },
          ]} />
          <FilterSelect label="" value={severityFilter} onChange={setSeverityFilter} options={[
            { value: '', label: 'All Severity' },
            { value: 'LOW', label: 'Low' },
            { value: 'MEDIUM', label: 'Medium' },
            { value: 'HIGH', label: 'High' },
            { value: 'CRITICAL', label: 'Critical' },
          ]} />
        </div>

        <Card>
          <CardContent>
            <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No risk flags found" onRetry={refetch} />
            {pagination && <div className="mt-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>}
          </CardContent>
        </Card>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction?.label ?? 'Update Flag'}
        message={`Are you sure you want to "${confirmAction?.label?.toLowerCase()}" this risk flag?`}
        confirmLabel={confirmAction?.label ?? 'Confirm'}
        loading={actionLoading !== null}
        onConfirm={() => confirmAction && handleStatusUpdate(confirmAction.id, confirmAction.action)}
        onCancel={() => setConfirmAction(null)}
      />

      {/* Notes Form for Resolve */}
      {showNotesForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowNotesForm(null); setNotes(''); }}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Resolve Risk Flag</h3>
            <p className="text-sm text-gray-600 mb-4">Add resolution notes (optional).</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Resolution notes..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
              rows={3}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setShowNotesForm(null); setNotes(''); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button
                onClick={() => handleStatusUpdate(showNotesForm, 'CONFIRMED', notes)}
                disabled={actionLoading === showNotesForm}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {actionLoading === showNotesForm ? 'Saving...' : 'Confirm Resolve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Flag Form */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreateForm(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Risk Flag</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Entity Type</label>
                <select value={createForm.entityType} onChange={(e) => setCreateForm({ ...createForm, entityType: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none">
                  <option value="">Select type</option>
                  <option value="user">User</option>
                  <option value="merchant">Merchant</option>
                  <option value="community">Community</option>
                  <option value="order">Order</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Entity ID</label>
                <input type="text" value={createForm.entityId} onChange={(e) => setCreateForm({ ...createForm, entityId: e.target.value })} placeholder="UUID of the entity" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Severity</label>
                <select value={createForm.severity} onChange={(e) => setCreateForm({ ...createForm, severity: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Reason</label>
                <textarea value={createForm.reason} onChange={(e) => setCreateForm({ ...createForm, reason: e.target.value })} placeholder="Describe the risk..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none" rows={2} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateForm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={!createForm.entityType || !createForm.entityId || !createForm.reason || createLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {createLoading ? 'Creating...' : 'Create Flag'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
