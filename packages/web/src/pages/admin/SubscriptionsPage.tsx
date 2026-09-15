import { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { adminNav } from '../../lib/navigation';
import { api } from '../../lib/api';
import { useAdminList, FilterSelect, Pagination, StatusBadge, DataTable } from '../../components/admin/AdminComponents';
import { Card, CardContent, Button } from '../../components/ui';

interface SubscriptionItem {
  id: string;
  communityId: string;
  plan: string;
  price: string;
  currency: string;
  billingPeriod: string;
  status: string;
  startedAt: string;
  expiresAt: string | null;
  [key: string]: unknown;
}

export default function SubscriptionsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const { data, pagination, loading, error, refetch, setPage } = useAdminList<SubscriptionItem>({
    path: '/admin/subscriptions',
    filters: statusFilter ? { status: statusFilter } : {},
  });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({ communityId: '', plan: 'standard', price: '499', billingPeriod: 'MONTHLY' });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');

  const activeCount = data.filter((s) => s.status === 'ACTIVE').length;
  const trialingCount = data.filter((s) => s.status === 'TRIALING').length;
  const pastDueCount = data.filter((s) => s.status === 'PAST_DUE').length;

  const handleCreate = async () => {
    setCreateLoading(true);
    setCreateError('');
    try {
      await api('/admin/subscriptions', {
        method: 'POST',
        body: {
          communityId: createForm.communityId,
          plan: createForm.plan,
          price: createForm.price,
          currency: 'INR',
          billingPeriod: createForm.billingPeriod,
        },
      });
      setShowCreateForm(false);
      setCreateForm({ communityId: '', plan: 'standard', price: '499', billingPeriod: 'MONTHLY' });
      refetch();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create subscription');
    } finally {
      setCreateLoading(false);
    }
  };

  const columns = [
    {
      key: 'communityId', label: 'Community',
      render: (item: SubscriptionItem) => (
        <span className="text-sm font-medium text-gray-900">{item.communityId.slice(0, 8)}...</span>
      ),
    },
    {
      key: 'plan', label: 'Plan',
      render: (item: SubscriptionItem) => (
        <span className="inline-flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${item.plan === 'enterprise' ? 'bg-purple-400' : item.plan === 'professional' ? 'bg-blue-400' : 'bg-gray-300'}`} />
          <span className="font-medium text-gray-900 capitalize">{item.plan}</span>
        </span>
      ),
    },
    {
      key: 'price', label: 'Price',
      render: (item: SubscriptionItem) => (
        <span className="text-gray-900 font-medium">{item.currency} {item.price}</span>
      ),
    },
    { key: 'status', label: 'Status', render: (item: SubscriptionItem) => <StatusBadge status={item.status} /> },
    {
      key: 'startedAt', label: 'Started',
      render: (item: SubscriptionItem) => (
        <span className="text-gray-500">{new Date(item.startedAt).toLocaleDateString()}</span>
      ),
    },
    {
      key: 'expiresAt', label: 'Expires',
      render: (item: SubscriptionItem) => item.expiresAt
        ? <span className="text-gray-500">{new Date(item.expiresAt).toLocaleDateString()}</span>
        : <span className="text-gray-300">-</span>,
    },
  ];

  return (
    <DashboardLayout title="Subscriptions" navItems={adminNav} navTitle="Admin">
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent>
            <p className="text-xs text-gray-500 font-medium">Active</p>
            <p className="text-xl font-bold text-green-600">{activeCount}</p>
          </CardContent></Card>
          <Card><CardContent>
            <p className="text-xs text-gray-500 font-medium">Trialing</p>
            <p className="text-xl font-bold text-blue-600">{trialingCount}</p>
          </CardContent></Card>
          <Card><CardContent>
            <p className="text-xs text-gray-500 font-medium">Past Due</p>
            <p className="text-xl font-bold text-amber-600">{pastDueCount}</p>
          </CardContent></Card>
        </div>
        <div className="flex justify-between items-center">
          <FilterSelect label="" value={statusFilter} onChange={setStatusFilter} options={[
            { value: '', label: 'All Status' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'PAST_DUE', label: 'Past Due' },
            { value: 'CANCELLED', label: 'Cancelled' },
            { value: 'TRIALING', label: 'Trialing' },
          ]} />
          <Button variant="primary" size="sm" onClick={() => setShowCreateForm(true)}>+ Create Subscription</Button>
        </div>
        <div className="bg-white rounded-xl border border-slate-100">
          <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No subscriptions found" onRetry={refetch} />
          {pagination && <div className="px-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>}
        </div>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreateForm(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create Subscription</h3>
            {createError && <p className="text-sm text-red-600 mb-3">{createError}</p>}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Community ID</label>
                <input type="text" value={createForm.communityId} onChange={(e) => setCreateForm({ ...createForm, communityId: e.target.value })} placeholder="UUID of the community" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Plan</label>
                <select value={createForm.plan} onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none">
                  <option value="standard">Standard</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Price (INR)</label>
                <input type="text" value={createForm.price} onChange={(e) => setCreateForm({ ...createForm, price: e.target.value })} placeholder="499" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Billing Period</label>
                <select value={createForm.billingPeriod} onChange={(e) => setCreateForm({ ...createForm, billingPeriod: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none">
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCreateForm(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={!createForm.communityId || !createForm.price || createLoading}
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
