import { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { adminNav } from '../../lib/navigation';
import { useAdminList, SearchInput, Pagination, DataTable } from '../../components/admin/AdminComponents';
import { Card, CardContent } from '../../components/ui';

interface AuditLogItem {
  id: string;
  communityId: string | null;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: string;
  [key: string]: unknown;
}

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  APPROVE: 'bg-green-100 text-green-700',
  REJECT: 'bg-red-100 text-red-700',
  SUSPEND: 'bg-red-100 text-red-700',
  ACTIVATE: 'bg-green-100 text-green-700',
};

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { data, pagination, loading, error, refetch, setPage } = useAdminList<AuditLogItem>({
    path: '/admin/audit',
    search,
    filters: {
      ...(entityFilter ? { entityType: entityFilter } : {}),
      ...(dateFrom ? { dateFrom } : {}),
      ...(dateTo ? { dateTo } : {}),
    },
  });

  const columns = [
    {
      key: 'action', label: 'Action',
      render: (item: AuditLogItem) => {
        const actionKey = item.action.split('.').pop() || item.action;
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${actionColors[actionKey] || 'bg-gray-100 text-gray-700'}`}>
            {item.action}
          </span>
        );
      },
    },
    {
      key: 'entityType', label: 'Entity',
      render: (item: AuditLogItem) => (
        <span className="text-gray-600 capitalize">{item.entityType}</span>
      ),
    },
    {
      key: 'entityId', label: 'Entity ID',
      render: (item: AuditLogItem) => item.entityId
        ? <span className="text-xs text-gray-400 font-mono">{item.entityId.slice(0, 8)}...</span>
        : <span className="text-gray-300">-</span>,
    },
    {
      key: 'communityId', label: 'Community',
      render: (item: AuditLogItem) => item.communityId
        ? <span className="text-xs text-gray-400 font-mono">{item.communityId.slice(0, 8)}...</span>
        : <span className="text-gray-300">System</span>,
    },
    {
      key: 'createdAt', label: 'Date',
      render: (item: AuditLogItem) => (
        <span className="text-gray-500">{new Date(item.createdAt).toLocaleString()}</span>
      ),
    },
  ];

  return (
    <DashboardLayout title="Audit Logs" navItems={adminNav} navTitle="Admin">
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card><CardContent>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <SearchInput value={search} onChange={setSearch} placeholder="Search by action..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Entity Type</label>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              >
                <option value="">All Types</option>
                <option value="community">Community</option>
                <option value="user">User</option>
                <option value="merchant">Merchant</option>
                <option value="order">Order</option>
                <option value="subscription">Subscription</option>
                <option value="finance">Finance</option>
                <option value="risk_flag">Risk Flag</option>
                <option value="finance_review">Shariah Review</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              />
            </div>
            {(dateFrom || dateTo) && (
              <div className="flex items-end">
                <button
                  onClick={() => { setDateFrom(''); setDateTo(''); }}
                  className="text-xs text-gray-500 hover:text-gray-700 px-2 py-2"
                >
                  Clear dates
                </button>
              </div>
            )}
          </div>
        </CardContent></Card>
        <div className="bg-white rounded-xl border border-slate-100">
          <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No audit logs found" onRetry={refetch} />
          {pagination && <div className="px-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>}
        </div>
      </div>
    </DashboardLayout>
  );
}
