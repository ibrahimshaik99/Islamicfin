import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/DashboardLayout';
import { communityNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useMutation } from '../../lib/useApi';
import { LoadingState, ErrorState, Card, CardContent } from '../../components/ui';
import { useAdminList, DataTable, StatusBadge, Pagination } from '../../components/admin/AdminComponents';

type ContractType = 'QARD_HASAN' | 'MUDARABAH' | 'MUSHARAKAH' | 'MURABAHAH' | 'IJARAH';

interface ContractTypeConfig {
  value: ContractType | '';
  label: string;
  description: string;
  monetaryFields: { key: string; label: string; placeholder: string }[];
  extraFields: { key: string; label: string; type: 'text' | 'number' | 'select'; placeholder?: string; options?: { value: string; label: string }[] }[];
  endpoint: string;
}

const CONTRACT_TYPE_CONFIGS: ContractTypeConfig[] = [
  {
    value: '',
    label: 'All Types',
    description: '',
    monetaryFields: [],
    extraFields: [],
    endpoint: '',
  },
  {
    value: 'QARD_HASAN',
    label: 'Qard Hasan',
    description: 'Interest-free loan with repayment of principal',
    monetaryFields: [{ key: 'principalAmount', label: 'Loan Amount (₹)', placeholder: 'e.g. 10000' }],
    extraFields: [{ key: 'durationMonths', label: 'Duration (Months)', type: 'select', options: [{ value: '3', label: '3 Months' }, { value: '6', label: '6 Months' }, { value: '12', label: '12 Months' }, { value: '24', label: '24 Months' }] }],
    endpoint: '/finance/contracts',
  },
  {
    value: 'MUDARABAH',
    label: 'Mudarabah',
    description: 'Profit-sharing partnership — capital provider and entrepreneur',
    monetaryFields: [{ key: 'principalAmount', label: 'Investment Amount (₹)', placeholder: 'e.g. 50000' }],
    extraFields: [
      { key: 'profitSharePercent', label: 'Profit Share %', type: 'number', placeholder: 'e.g. 70' },
      { key: 'durationMonths', label: 'Duration (Months)', type: 'select', options: [{ value: '6', label: '6 Months' }, { value: '12', label: '12 Months' }, { value: '24', label: '24 Months' }] },
    ],
    endpoint: '/finance/mudarabah',
  },
  {
    value: 'MUSHARAKAH',
    label: 'Musharakah',
    description: 'Joint venture — shared capital, shared ownership and profit',
    monetaryFields: [{ key: 'principalAmount', label: 'Capital Contribution (₹)', placeholder: 'e.g. 50000' }],
    extraFields: [
      { key: 'profitSharePercent', label: 'Profit Share %', type: 'number', placeholder: 'e.g. 50' },
      { key: 'durationMonths', label: 'Duration (Months)', type: 'select', options: [{ value: '6', label: '6 Months' }, { value: '12', label: '12 Months' }, { value: '24', label: '24 Months' }] },
    ],
    endpoint: '/finance/musharakah',
  },
  {
    value: 'MURABAHAH',
    label: 'Murabahah',
    description: 'Cost-plus sale — disclosed cost with agreed profit margin',
    monetaryFields: [
      { key: 'principalAmount', label: 'Asset Value (₹)', placeholder: 'e.g. 80000' },
      { key: 'purchasePrice', label: 'Purchase Price (₹)', placeholder: 'e.g. 80000' },
      { key: 'salePrice', label: 'Sale Price (₹)', placeholder: 'e.g. 95000' },
    ],
    extraFields: [
      { key: 'assetDescription', label: 'Asset Description', type: 'text', placeholder: 'e.g. Commercial property in Mumbai' },
      { key: 'seller', label: 'Seller', type: 'text', placeholder: 'e.g. ABC Properties Ltd' },
    ],
    endpoint: '/finance/murabahah',
  },
  {
    value: 'IJARAH',
    label: 'Ijarah',
    description: 'Leasing arrangement — asset usage for periodic payment',
    monetaryFields: [
      { key: 'principalAmount', label: 'Asset Value (₹)', placeholder: 'e.g. 100000' },
      { key: 'leasePaymentAmount', label: 'Lease Payment (₹)', placeholder: 'e.g. 5000' },
    ],
    extraFields: [
      { key: 'assetDescription', label: 'Asset Description', type: 'text', placeholder: 'e.g. Industrial sewing machine' },
      { key: 'durationMonths', label: 'Lease Period (Months)', type: 'select', options: [{ value: '6', label: '6 Months' }, { value: '12', label: '12 Months' }, { value: '24', label: '24 Months' }, { value: '36', label: '36 Months' }] },
    ],
    endpoint: '/finance/ijarah',
  },
];

const getConfigForType = (type: string) => CONTRACT_TYPE_CONFIGS.find((c) => c.value === type) || CONTRACT_TYPE_CONFIGS[0];

const INITIAL_FORM = {
  title: '',
  description: '',
  contractType: 'QARD_HASAN' as ContractType,
  principalAmount: '',
  profitSharePercent: '',
  purchasePrice: '',
  salePrice: '',
  leasePaymentAmount: '',
  assetDescription: '',
  seller: '',
  durationMonths: '12',
};

export default function FinancePage() {
  const { communityId } = useAuth();
  const navigate = useNavigate();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [contractTypeFilter, setContractTypeFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const { mutate, loading: mutating, error: mutateError, resetError } = useMutation();

  const path = contractTypeFilter
    ? `${prefix}/finance/contracts/type/${contractTypeFilter}`
    : `${prefix}/finance/contracts`;

  const { data, pagination, loading, error, refetch, setPage } = useAdminList<Record<string, unknown>>({ path, limit: 20 });

  const [reviewQueue, setReviewQueue] = useState<Record<string, unknown>[]>([]);
  const [reviewQueueLoading, setReviewQueueLoading] = useState(false);
  const [showReviewQueue, setShowReviewQueue] = useState(false);
  const [reviewForm, setReviewForm] = useState<{ contractId: string; reviewer: string; status: string; comments: string } | null>(null);

  const fetchReviewQueue = async () => {
    if (!communityId) return;
    setReviewQueueLoading(true);
    try {
      const res = await fetch(`/api/v1/communities/${communityId}/finance/review-queue`, { credentials: 'include' });
      const json = await res.json();
      setReviewQueue(json.data || []);
    } catch { /* ignore */ }
    setReviewQueueLoading(false);
  };

  const handleReviewSubmit = async () => {
    if (!reviewForm || !communityId) return;
    try {
      const res = await fetch(`/api/v1/communities/${communityId}/finance/contracts/${reviewForm.contractId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reviewer: reviewForm.reviewer, status: reviewForm.status, comments: reviewForm.comments }),
      });
      if (res.ok) {
        setBanner({ type: 'success', message: 'Review submitted successfully.' });
        setReviewForm(null);
        fetchReviewQueue();
        refetch();
      } else {
        const err = await res.json();
        setBanner({ type: 'error', message: err?.error?.message || 'Failed to submit review.' });
      }
    } catch { setBanner({ type: 'error', message: 'Failed to submit review.' }); }
  };

  const activeConfig = getConfigForType(form.contractType);

  const dismissBanner = useCallback(() => setBanner(null), []);

  useEffect(() => {
    if (banner) {
      const t = setTimeout(dismissBanner, 4000);
      return () => clearTimeout(t);
    }
  }, [banner, dismissBanner]);

  useEffect(() => {
    if (mutateError) {
      setBanner({ type: 'error', message: mutateError });
    }
  }, [mutateError]);

  const updateField = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const buildBody = (): Record<string, unknown> => {
    const body: Record<string, unknown> = {
      title: form.title.trim(),
      description: form.description.trim() || undefined,
    };

    if (form.contractType === 'QARD_HASAN') {
      body.principalAmount = form.principalAmount || undefined;
    } else if (form.contractType === 'MUDARABAH') {
      body.principalAmount = form.principalAmount || undefined;
      if (form.profitSharePercent) {
        body.profitSharingRatio = form.profitSharePercent;
      }
    } else if (form.contractType === 'MUSHARAKAH') {
      body.principalAmount = form.principalAmount || undefined;
      if (form.profitSharePercent) {
        body.profitSharingRatio = form.profitSharePercent;
      }
    } else if (form.contractType === 'MURABAHAH') {
      body.principalAmount = form.principalAmount || undefined;
      body.assetDescription = form.assetDescription.trim() || undefined;
      body.seller = form.seller?.trim() || undefined;
      body.purchasePrice = form.purchasePrice || undefined;
      body.salePrice = form.salePrice || undefined;
    } else if (form.contractType === 'IJARAH') {
      body.principalAmount = form.principalAmount || undefined;
      body.assetDescription = form.assetDescription.trim() || undefined;
      body.leasePeriod = form.durationMonths ? `${form.durationMonths} months` : undefined;
      body.leasePayments = form.leasePaymentAmount || undefined;
    }

    return body;
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    if (form.contractType === 'MURABAHAH') {
      const purchase = parseFloat(form.purchasePrice);
      const sale = parseFloat(form.salePrice);
      if (!isNaN(purchase) && !isNaN(sale) && sale <= purchase) {
        setBanner({ type: 'error', message: 'Sale price must be greater than purchase price for Murabahah.' });
        return;
      }
      if (!form.assetDescription.trim() || !form.seller.trim()) {
        setBanner({ type: 'error', message: 'Asset description and seller are required for Murabahah.' });
        return;
      }
    }
    if (form.contractType === 'IJARAH') {
      if (!form.assetDescription.trim()) {
        setBanner({ type: 'error', message: 'Asset description is required for Ijarah.' });
        return;
      }
    }

    const endpoint = activeConfig.endpoint;
    const body = buildBody();
    const result = await mutate(`${prefix}${endpoint}`, { body });

    if (result) {
      setBanner({ type: 'success', message: `${activeConfig.label} contract created successfully.` });
      setForm(INITIAL_FORM);
      setShowCreate(false);
      refetch();
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Contract',
      render: (item: Record<string, unknown>) => (
        <span className="font-medium text-slate-900">{String(item.title)}</span>
      ),
    },
    {
      key: 'contractType',
      label: 'Type',
      render: (item: Record<string, unknown>) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          {String(item.contractType).replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (item: Record<string, unknown>) => {
        const ct = String(item.contractType);
        let amount = item.principalAmount;
        let prefixStr = '₹';
        if (ct === 'MURABAHAH') {
          amount = item.salePrice;
          prefixStr = 'Sale ₹';
        } else if (ct === 'IJARAH') {
          amount = item.leasePaymentAmount;
          prefixStr = 'Lease ₹';
        }
        return <span className="text-sm font-medium text-slate-900">{prefixStr}{String(amount ?? '')}</span>;
      },
    },
    {
      key: 'partner',
      label: 'Partner',
      render: (item: Record<string, unknown>) => (
        <span className="text-sm text-slate-600">{String(item.partnerName || item.partnerUserId || '-')}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: Record<string, unknown>) => <StatusBadge status={String(item.status)} />,
    },
    {
      key: 'shariahReviewStatus',
      label: 'Shariah',
      render: (item: Record<string, unknown>) => <StatusBadge status={String(item.shariahReviewStatus)} />,
    },
    {
      key: 'legalStatus',
      label: 'Legal',
      render: (item: Record<string, unknown>) => <StatusBadge status={String(item.legalStatus)} />,
    },
    {
      key: 'delete', label: '', className: 'text-right',
      render: (item: Record<string, unknown>) => (
        <button
          onClick={async () => {
            if (!confirm('Delete this contract?')) return;
            try {
              await fetch(`/api/v1/communities/${communityId}/finance/contracts/${item.id}`, { method: 'DELETE', credentials: 'include' });
              setBanner({ type: 'success', message: 'Contract deleted.' });
              refetch();
            } catch {
              setBanner({ type: 'error', message: 'Failed to delete contract.' });
            }
          }}
          className="text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
        >
          Delete
        </button>
      ),
    },
  ];

  return (
    <DashboardLayout title="Islamic Finance" navItems={communityNav} navTitle="Community">
      {banner && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 ${
            banner.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          <span className="flex-1">{banner.message}</span>
          <button onClick={dismissBanner} className="text-current opacity-60 hover:opacity-100">&times;</button>
        </div>
      )}

      {loading && <LoadingState />}
      {error && !loading && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {showReviewQueue && (
            <Card>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">Pending Reviews ({reviewQueue.length})</h3>
                  <button
                    onClick={() => { setShowReviewQueue(false); setReviewForm(null); }}
                    className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
                  >
                    Collapse
                  </button>
                </div>
                {reviewQueueLoading ? (
                  <LoadingState />
                ) : reviewQueue.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">No contracts pending review</p>
                ) : (
                  <div className="space-y-3">
                    {reviewQueue.map((item) => (
                      <div key={String(item.id)} className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-200">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-900">{String(item.title)}</p>
                          <p className="text-xs text-slate-500 mt-1">{String(item.contractType).replace(/_/g, ' ')} — ₹{String(item.principalAmount ?? item.salePrice ?? item.leasePaymentAmount ?? '')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.initiatorId ? (
                            <button
                              onClick={async () => {
                                if (!communityId) return;
                                try {
                                  const res = await fetch(`/api/v1/communities/${communityId}/conversations`, {
                                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ type: 'DIRECT', memberIds: [String(item.initiatorId)] }),
                                  });
                                  const result = await res.json();
                                  if (result.data?.id) navigate(`/community/messages?conversationId=${result.data.id}`);
                                  else navigate('/community/messages');
                                } catch { navigate('/community/messages'); }
                              }}
                              className="px-2 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                              title="Chat with initiator"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.068.157 2.148.279 3.238.364.466.037.893.281 1.153.671L12 21l2.652-3.978c.26-.39.687-.634 1.153-.67 1.09-.086 2.17-.208 3.238-.365 1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>
                            </button>
                          ) : null}
                          <button
                            onClick={() => setReviewForm({ contractId: String(item.id), reviewer: '', status: 'REVIEWED', comments: '' })}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setReviewForm({ contractId: String(item.id), reviewer: '', status: 'NEEDS_REVISION', comments: '' })}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {reviewForm && (
                  <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Reviewer Name</label>
                      <input
                        value={reviewForm.reviewer}
                        onChange={(e) => setReviewForm({ ...reviewForm, reviewer: e.target.value })}
                        placeholder="e.g. Shariah Board"
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-600 mb-1 block">Comments</label>
                      <textarea
                        value={reviewForm.comments}
                        onChange={(e) => setReviewForm({ ...reviewForm, comments: e.target.value })}
                        rows={2}
                        placeholder="Review comments..."
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setReviewForm(null)}
                        className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReviewSubmit}
                        disabled={!reviewForm.reviewer.trim()}
                        className="px-4 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
                      >
                        Submit Review
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Finance Contracts ({pagination?.total ?? data.length})</h2>
            <div className="flex items-center gap-3">
              <select
                value={contractTypeFilter}
                onChange={(e) => setContractTypeFilter(e.target.value)}
                className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors"
              >
                {CONTRACT_TYPE_CONFIGS.map((ct) => (
                  <option key={ct.value} value={ct.value}>{ct.label}</option>
                ))}
              </select>
              <button
                onClick={() => { setShowReviewQueue(!showReviewQueue); if (!showReviewQueue) fetchReviewQueue(); }}
                className={`px-3 py-2.5 text-sm font-medium rounded-xl transition-colors ${showReviewQueue ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100'}`}
              >
                Review Queue {reviewQueue.length > 0 && `(${reviewQueue.length})`}
              </button>
              <button
                onClick={() => { refetch(); }}
                className="px-3 py-2.5 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 transition-colors"
              >
                Refresh
              </button>
              <button
                onClick={() => { setShowCreate(!showCreate); resetError(); }}
                className="px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 shadow-sm shadow-teal-600/20 transition-colors"
              >
                {showCreate ? 'Cancel' : 'Create Contract'}
              </button>
            </div>
          </div>

          {showCreate && (
            <Card>
              <CardContent>
                <div className="space-y-5">
                  <div className="rounded-xl bg-teal-50 border border-teal-100 px-4 py-3">
                    <p className="text-sm font-semibold text-teal-800">{activeConfig.label}</p>
                    <p className="text-xs text-teal-600 mt-0.5">{activeConfig.description}</p>
                  </div>

                  <div className="space-y-4">
                    <select
                      value={form.contractType}
                      onChange={(e) => updateField('contractType', e.target.value)}
                      className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors"
                    >
                      {CONTRACT_TYPE_CONFIGS.filter((ct) => ct.value).map((ct) => (
                        <option key={ct.value} value={ct.value}>{ct.label}</option>
                      ))}
                    </select>

                    <input
                      value={form.title}
                      onChange={(e) => updateField('title', e.target.value)}
                      placeholder="Contract title *"
                      className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors bg-slate-50 hover:bg-white focus:bg-white"
                    />

                    <textarea
                      value={form.description}
                      onChange={(e) => updateField('description', e.target.value)}
                      rows={2}
                      placeholder="Description (optional)"
                      className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors bg-slate-50 hover:bg-white focus:bg-white resize-none"
                    />

                    {activeConfig.monetaryFields.map((field) => (
                      <input
                        key={field.key}
                        value={form[field.key as keyof typeof form] as string}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        type="number"
                        min="0"
                        className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors bg-slate-50 hover:bg-white focus:bg-white"
                      />
                    ))}

                    {activeConfig.extraFields.map((field) => (
                      <div key={field.key}>
                        {field.type === 'select' ? (
                          <select
                            value={form[field.key as keyof typeof form] as string}
                            onChange={(e) => updateField(field.key, e.target.value)}
                            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors"
                          >
                            {field.options?.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            value={form[field.key as keyof typeof form] as string}
                            onChange={(e) => updateField(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            type={field.type}
                            min={field.type === 'number' ? '0' : undefined}
                            max={field.key === 'profitSharePercent' ? '100' : undefined}
                            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors bg-slate-50 hover:bg-white focus:bg-white"
                          />
                        )}
                      </div>
                    ))}

                    {form.contractType === 'MURABAHAH' && form.purchasePrice && form.salePrice && (
                      <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm">
                        <span className="text-slate-500">Profit margin: </span>
                        <span className="font-semibold text-slate-900">
                          {(() => {
                            const p = parseFloat(form.purchasePrice);
                            const s = parseFloat(form.salePrice);
                            if (isNaN(p) || isNaN(s) || p === 0) return '-';
                            return `₹${(s - p).toFixed(2)} (${(((s - p) / p) * 100).toFixed(1)}%)`;
                          })()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => { setShowCreate(false); resetError(); }}
                      className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreate}
                      disabled={mutating || !form.title.trim()}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-teal-600/20 flex items-center gap-2 transition-colors"
                    >
                      {mutating && <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {mutating ? 'Creating...' : 'Create Contract'}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent>
              <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No finance contracts yet" onRetry={refetch} />
              {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
