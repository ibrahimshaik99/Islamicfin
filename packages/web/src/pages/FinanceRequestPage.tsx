import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Card, CardContent } from '../components/ui';
import { useAdminList, DataTable, StatusBadge, Pagination, FilterSelect } from '../components/admin/AdminComponents';

type RequestType = 'INVESTMENT' | 'LOAN' | 'DONATION' | 'PARTNERSHIP';
type RequestStatus = 'PENDING' | 'CONTACTED' | 'CLOSED';

interface FinanceRequest {
  id: string;
  requestType: RequestType;
  amount: string | null;
  description: string;
  contactPhone: string | null;
  status: RequestStatus;
  createdAt: string;
  [key: string]: unknown;
}

interface FinanceRequestPageProps {
  navItems: Array<{ label: string; path: string; icon: React.ReactNode }>;
  navTitle: string;
  title?: string;
  canCreate?: boolean;
  canManage?: boolean;
  apiPath?: string;
}

const REQUEST_TYPES: { value: RequestType; label: string }[] = [
  { value: 'INVESTMENT', label: 'Investment' },
  { value: 'LOAN', label: 'Loan' },
  { value: 'DONATION', label: 'Donation' },
  { value: 'PARTNERSHIP', label: 'Partnership' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'CLOSED', label: 'Closed' },
];

const REQUEST_TYPE_FILTER_OPTIONS = [
  { value: '', label: 'All Types' },
  ...REQUEST_TYPES,
];

export default function FinanceRequestPage({ navItems, navTitle, title = 'Finance Requests', canCreate = true, canManage = false, apiPath }: FinanceRequestPageProps) {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const basePath = apiPath || `${prefix}/finance-requests`;

  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<RequestType>('INVESTMENT');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filters: Record<string, string> = {};
  if (statusFilter) filters.status = statusFilter;
  if (typeFilter) filters.requestType = typeFilter;

  const { data, pagination, loading, error, refetch, setPage, setFilters } = useAdminList<FinanceRequest>({
    path: basePath,
    limit: 20,
    filters,
  });

  useEffect(() => {
    setFilters({ ...filters });
  }, [statusFilter, typeFilter]);

  const dismissBanner = useCallback(() => {
    setFormSuccess(false);
    setFormError('');
  }, []);

  useEffect(() => {
    if (formSuccess || formError) {
      const t = setTimeout(dismissBanner, 4000);
      return () => clearTimeout(t);
    }
  }, [formSuccess, formError, dismissBanner]);

  const handleCreate = async () => {
    setFormError('');
    if (!formDescription.trim()) {
      setFormError('Description is required.');
      return;
    }

    setSubmitting(true);
    try {
      await api(`${prefix}/finance-requests`, {
        method: 'POST',
        body: {
          requestType: formType,
          amount: formAmount || undefined,
          description: formDescription.trim(),
          contactPhone: formPhone || undefined,
        },
      });
      setFormSuccess(true);
      setFormDescription('');
      setFormAmount('');
      setFormPhone('');
      setShowForm(false);
      refetch();
    } catch {
      setFormError('Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (id: string, newStatus: RequestStatus) => {
    setActionLoading(id);
    try {
      await api(`${basePath}/${id}/status`, {
        method: 'PATCH',
        body: { status: newStatus },
      });
      refetch();
    } catch {
      setFormError('Failed to update status.');
    } finally {
      setActionLoading(null);
    }
  };

  const columns = [
    {
      key: 'requestType',
      label: 'Type',
      render: (item: FinanceRequest) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          {item.requestType}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (item: FinanceRequest) => (
        <span className="text-sm font-medium text-slate-900">
          {item.amount ? `₹${item.amount}` : '-'}
        </span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (item: FinanceRequest) => (
        <span className="text-sm text-slate-600 line-clamp-2 max-w-[200px]">{item.description}</span>
      ),
    },
    {
      key: 'contactPhone',
      label: 'Contact',
      render: (item: FinanceRequest) => (
        <span className="text-sm text-slate-600">{item.contactPhone || '-'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: FinanceRequest) => <StatusBadge status={item.status} />,
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (item: FinanceRequest) => (
        <span className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</span>
      ),
    },
  ];

  if (canManage) {
    columns.push({
      key: 'actions',
      label: 'Actions',
      render: (item: FinanceRequest) => (
        <div className="flex items-center gap-2">
          {item.status === 'PENDING' && (
            <button
              onClick={() => handleStatusUpdate(item.id, 'CONTACTED')}
              disabled={actionLoading === item.id}
              className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors"
            >
              {actionLoading === item.id ? '...' : 'Contact'}
            </button>
          )}
          {item.status !== 'CLOSED' && (
            <button
              onClick={() => handleStatusUpdate(item.id, 'CLOSED')}
              disabled={actionLoading === item.id}
              className="px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              {actionLoading === item.id ? '...' : 'Close'}
            </button>
          )}
        </div>
      ),
    });
  }

  return (
    <DashboardLayout title={title} navItems={navItems} navTitle={navTitle}>
      {(formSuccess || formError) && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 ${
            formSuccess
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          <span className="flex-1">{formSuccess ? 'Request submitted successfully!' : formError}</span>
          <button onClick={dismissBanner} className="text-current opacity-60 hover:opacity-100">&times;</button>
        </div>
      )}

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Finance Requests ({pagination?.total ?? data.length})
          </h2>
          <div className="flex items-center gap-3">
            <FilterSelect
              label=""
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_OPTIONS}
            />
            <FilterSelect
              label=""
              value={typeFilter}
              onChange={setTypeFilter}
              options={REQUEST_TYPE_FILTER_OPTIONS}
            />
            {canCreate && (
              <button
                onClick={() => setShowForm(!showForm)}
                className="px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 shadow-sm shadow-teal-600/20 transition-colors"
              >
                {showForm ? 'Cancel' : 'New Request'}
              </button>
            )}
          </div>
        </div>

        {showForm && canCreate && (
          <Card>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Request Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as RequestType)}
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors"
                  >
                    {REQUEST_TYPES.map((rt) => (
                      <option key={rt.value} value={rt.value}>{rt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors bg-slate-50 hover:bg-white focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Description *</label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={3}
                    placeholder="Describe your finance request..."
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors bg-slate-50 hover:bg-white focus:bg-white resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="Optional"
                    className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors bg-slate-50 hover:bg-white focus:bg-white"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={submitting || !formDescription.trim()}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-teal-600/20 flex items-center gap-2 transition-colors"
                  >
                    {submitting && <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent>
            <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No finance requests yet" onRetry={refetch} />
            {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
