import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { merchantNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useMutation } from '../../lib/useApi';
import { LoadingState, ErrorState, Button, Input, Select, Card, CardContent } from '../../components/ui';
import { useAdminList, StatusBadge, Pagination, SearchInput } from '../../components/admin/AdminComponents';

interface FinanceContract {
  id: string;
  contractType: string;
  title: string;
  description: string | null;
  principalAmount: string;
  currency: string;
  status: string;
  shariahReviewStatus: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  [key: string]: unknown;
}

interface ContractForm {
  contractType: string;
  title: string;
  description: string;
  principalAmount: string;
  currency: string;
  startDate: string;
  endDate: string;
}

const EMPTY_FORM: ContractForm = {
  contractType: 'MUDARABAH',
  title: '',
  description: '',
  principalAmount: '',
  currency: 'INR',
  startDate: '',
  endDate: '',
};

const CONTRACT_TYPES = [
  { value: 'MUDARABAH', label: 'Mudarabah (Profit-Sharing)', desc: 'One party provides capital, the other provides management expertise. Profits shared per agreed ratio.' },
  { value: 'MUSHARAKAH', label: 'Musharakah (Joint Venture)', desc: 'All parties contribute capital and/or effort. Profits and losses shared per agreed ratio.' },
  { value: 'MURABAHAH', label: 'Murabahah (Cost-Plus Sale)', desc: 'Sale at an agreed markup. Asset purchased by seller and sold to buyer at higher price.' },
  { value: 'IJARAH', label: 'Ijarah (Lease)', desc: 'Leasing of an asset for a specified period with agreed rental payments.' },
];

function ContractTypeIcon({ type }: { type: string }) {
  const colors: Record<string, string> = {
    MUDARABAH: 'bg-blue-100 text-blue-600',
    MUSHARAKAH: 'bg-purple-100 text-purple-600',
    MURABAHAH: 'bg-emerald-100 text-emerald-600',
    IJARAH: 'bg-amber-100 text-amber-600',
    QARD_HASAN: 'bg-rose-100 text-rose-600',
  };
  const labels: Record<string, string> = {
    MUDARABAH: 'M',
    MUSHARAKAH: 'M',
    MURABAHAH: 'M',
    IJARAH: 'I',
    QARD_HASAN: 'Q',
  };
  return (
    <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs font-bold ${colors[type] || 'bg-gray-100 text-gray-600'}`}>
      {labels[type] || type[0]}
    </span>
  );
}

export default function MerchantFinancePage() {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ContractForm>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const { mutate, loading: mutating } = useMutation();

  const { data, pagination, loading, error, refetch, setPage } = useAdminList<FinanceContract>({
    path: `${prefix}/finance/contracts`,
    limit: 20,
    search,
    filters: { ...(typeFilter ? { contractType: typeFilter } : {}), ...(statusFilter ? { status: statusFilter } : {}) },
  });

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

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setShowForm(false);
    setFormError('');
  };

  const getCreateEndpoint = (type: string) => {
    switch (type) {
      case 'MUDARABAH': return `${prefix}/finance/mudarabah`;
      case 'MUSHARAKAH': return `${prefix}/finance/musharakah`;
      case 'MURABAHAH': return `${prefix}/finance/murabahah`;
      case 'IJARAH': return `${prefix}/finance/ijarah`;
      default: return `${prefix}/finance/contracts`;
    }
  };

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.principalAmount) return;
    setFormError('');
    setFormSuccess('');

    const endpoint = getCreateEndpoint(form.contractType);
    const body: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      principalAmount: form.principalAmount,
      currency: form.currency,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
    };

    const result = await mutate(endpoint, { body });
    if (result) {
      setFormSuccess('Finance contract created! Submit for Shariah review when ready.');
      resetForm();
      refetch();
      setTimeout(() => setFormSuccess(''), 4000);
    } else {
      setFormError('Failed to create contract. Please check your inputs and try again.');
    }
  };

  const handleDeleteContract = async (contractId: string) => {
    await mutate(`${prefix}/finance/contracts/${contractId}/cancel`, { method: 'POST' });
    refetch();
  };

  const handleSubmitForReview = async (contractId: string) => {
    const result = await mutate(`${prefix}/finance/contracts/${contractId}/submit-review`, { method: 'POST' });
    if (result !== null) {
      refetch();
    }
  };

  const columns = [
    {
      key: 'contractType',
      label: 'Type',
      render: (item: FinanceContract) => (
        <div className="flex items-center gap-2">
          <ContractTypeIcon type={item.contractType} />
          <span className="text-xs font-medium text-gray-900">{item.contractType.replace(/_/g, ' ')}</span>
        </div>
      ),
    },
    {
      key: 'title',
      label: 'Title',
      render: (item: FinanceContract) => (
        <span className="text-sm font-medium text-gray-900 truncate max-w-[200px] block">{item.title}</span>
      ),
    },
    {
      key: 'principalAmount',
      label: 'Amount',
      className: 'text-right',
      render: (item: FinanceContract) => (
        <span className="text-sm font-semibold text-gray-900">₹{item.principalAmount}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: FinanceContract) => <StatusBadge status={item.status} />,
    },
    {
      key: 'shariahReviewStatus',
      label: 'Shariah',
      render: (item: FinanceContract) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          item.shariahReviewStatus === 'REVIEWED' ? 'bg-green-100 text-green-700' :
          item.shariahReviewStatus === 'PENDING_REVIEW' ? 'bg-yellow-100 text-yellow-700' :
          item.shariahReviewStatus === 'NEEDS_REVISION' ? 'bg-orange-100 text-orange-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {item.shariahReviewStatus.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (item: FinanceContract) => (
        <span className="text-xs text-gray-500">{new Date(item.createdAt).toLocaleDateString()}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      className: 'text-right',
      render: (item: FinanceContract) => (
        <div className="flex items-center justify-end gap-1">
          {item.status === 'DRAFT' && (
            <>
              <button
                onClick={() => handleSubmitForReview(item.id)}
                className="text-xs font-medium text-amber-600 hover:text-amber-700 px-2 py-1 rounded hover:bg-amber-50 transition-colors"
              >
                Submit for Review
              </button>
              <button
                onClick={() => handleDeleteContract(item.id)}
                className="text-xs font-medium text-red-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
              >
                Cancel
              </button>
            </>
          )}
          {item.status === 'PENDING_REVIEW' && (
            <span className="text-xs text-amber-600 font-medium px-2 py-1">Awaiting Review</span>
          )}
          {item.status === 'ACTIVE' && (
            <span className="text-xs text-green-600 font-medium px-2 py-1">Active</span>
          )}
        </div>
      ),
    },
  ];

  const selectedTypeInfo = CONTRACT_TYPES.find((t) => t.value === form.contractType);

  return (
    <DashboardLayout title="Islamic Finance" navItems={merchantNav} navTitle="Merchant">
      {loading && !data.length && <LoadingState />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Islamic Finance Contracts</h2>
              <p className="text-sm text-gray-500 mt-1">Create and manage finance contracts with investors</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 hidden sm:block">Updated {lastRefreshed.toLocaleTimeString()}</span>
              <button
                onClick={handleManualRefresh}
                className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                title="Refresh"
              >
                ↻
              </button>
              <Button
                onClick={() => { if (showForm) resetForm(); else { setShowForm(true); setFormError(''); } }}
                variant={showForm ? 'secondary' : 'primary'}
              >
                {showForm ? 'Cancel' : '+ New Contract'}
              </Button>
            </div>
          </div>

          {formSuccess && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              {formSuccess}
            </div>
          )}

          {showForm && (
            <Card className="border-primary-100 ring-1 ring-primary-100">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-5">
                  <div className="h-8 w-8 rounded-lg bg-primary-100 flex items-center justify-center">
                    <svg className="h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">New Finance Contract</h3>
                </div>

                {formError && (
                  <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Select
                      label="Contract Type"
                      value={form.contractType}
                      onChange={(e) => setForm({ ...form, contractType: e.target.value })}
                      options={CONTRACT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                    />
                    {selectedTypeInfo && (
                      <p className="mt-1 text-xs text-gray-500">{selectedTypeInfo.desc}</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <Input
                      label="Contract Title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Mudarabah for Textile Business"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Describe the contract terms and purpose..."
                      rows={3}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <Input
                    label="Principal Amount (₹)"
                    value={form.principalAmount}
                    onChange={(e) => setForm({ ...form, principalAmount: e.target.value })}
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    min="0"
                  />
                  <Select
                    label="Currency"
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    options={[{ value: 'INR', label: 'INR (₹)' }]}
                  />
                  <Input
                    label="Start Date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    type="date"
                  />
                  <Input
                    label="End Date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    type="date"
                  />
                </div>

                <div className="mt-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <p className="text-xs text-amber-700">
                    <strong>Note:</strong> Contracts are created in DRAFT status. After creation, submit for Shariah review before activation.
                    The merchant must obtain proper Shariah board approval before executing any finance contract.
                  </p>
                </div>

                <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
                  <Button variant="secondary" onClick={resetForm}>Cancel</Button>
                  <Button onClick={handleSubmit} loading={mutating} disabled={!form.title.trim() || !form.principalAmount}>
                    Create Contract
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total', value: pagination?.total ?? data.length, color: 'from-primary-500 to-primary-600' },
              { label: 'Mudarabah', value: data.filter((c) => c.contractType === 'MUDARABAH').length, color: 'from-blue-500 to-blue-600' },
              { label: 'Musharakah', value: data.filter((c) => c.contractType === 'MUSHARAKAH').length, color: 'from-purple-500 to-purple-600' },
              { label: 'Murabahah', value: data.filter((c) => c.contractType === 'MURABAHAH').length, color: 'from-emerald-500 to-emerald-600' },
            ].map((stat) => (
              <div key={stat.label} className="relative overflow-hidden rounded-xl bg-white border border-gray-100 p-4 shadow-sm">
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-[0.04]`} />
                <p className="text-xs font-medium text-gray-500 relative">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 relative">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search contracts..." /></div>
            <div className="flex gap-2">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              >
                <option value="">All Types</option>
                {CONTRACT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label.split('(')[0].trim()}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              >
                <option value="">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {columns.map((col) => (
                        <th key={col.key} className={`text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider ${col.className || ''}`}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={columns.length} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center">
                              <svg className="h-6 w-6 text-primary-500" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">No finance contracts yet</p>
                              <p className="text-xs text-gray-500 mt-1">Create your first contract to start engaging investors</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      data.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/80 transition-colors duration-150">
                          {columns.map((col) => (
                            <td key={col.key} className={`py-3.5 px-4 ${col.className || ''}`}>
                              {col.render ? col.render(item) : String(item[col.key as keyof FinanceContract] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {pagination && (
                <div className="px-4 pb-4">
                  <Pagination pagination={pagination} onPageChange={setPage} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
