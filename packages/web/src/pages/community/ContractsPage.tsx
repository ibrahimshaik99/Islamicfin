import { useState, useEffect, useCallback, useRef } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { communityNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { useAdminList, Pagination, DataTable, StatusBadge } from '../../components/admin/AdminComponents';
import { Card, CardContent } from '../../components/ui';

interface ContractTemplate {
  id: string;
  title: string;
  contractType: string;
  content: string;
  principalAmount: string | null;
  partnerName: string | null;
  durationMonths: string | null;
  profitSharePercent: string | null;
  assetDescription: string | null;
  additionalTerms: string | null;
  status: string;
  createdAt: string;
  [key: string]: unknown;
}

const CONTRACT_TYPES = [
  { value: 'QARD_HASAN', label: 'Qard Hasan', description: 'Interest-free loan with repayment of principal' },
  { value: 'MUDARABAH', label: 'Mudarabah', description: 'Profit-sharing partnership' },
  { value: 'MUSHARAKAH', label: 'Musharakah', description: 'Joint venture with shared capital and profit' },
  { value: 'MURABAHAH', label: 'Murabahah', description: 'Cost-plus sale with disclosed margin' },
  { value: 'IJARAH', label: 'Ijarah', description: 'Leasing arrangement for periodic payment' },
];

const DEFAULT_CONTENTS: Record<string, string> = {
  QARD_HASAN: `ISLAMIC FINANCE CONTRACT — QARD HASAN

This agreement is entered into on {DATE} between:

Lender (Muqrid): {LENDER_NAME}
Borrower (Muqtarid): {BORROWER_NAME}

1. PRINCIPAL AMOUNT: ₹{AMOUNT}
2. PURPOSE: Interest-free loan to be used for legitimate business/personal needs
3. REPAYMENT: The Borrower agrees to repay the full principal amount in {DURATION} monthly installments of ₹{INSTALLMENT}
4. NO INTEREST OR RIBA: This is a Qard Hasan (benevolent loan). No interest, fee, or additional charge is levied.
5. LATE PAYMENT: In case of late payment, a voluntary donation to charity may be requested, but is not obligatory.
6. DEFAULT: If the Borrower fails to pay for 3 consecutive months, the Lender may declare the full amount due.
7. SHARIAH COMPLIANCE: This contract is reviewed and approved in accordance with Islamic finance principles.

Signatures:
___________________          ___________________
Lender                        Borrower

Shariah Review: {SHARIAH_STATUS}`,

  MUDARABAH: `ISLAMIC FINANCE CONTRACT — MUDARABAH

This agreement is entered into on {DATE} between:

Rab-ul-Mal (Capital Provider): {LENDER_NAME}
Mudarib (Entrepreneur): {BORROWER_NAME}

1. CAPITAL INVESTMENT: ₹{AMOUNT}
2. PROFIT SHARING: {PROFIT_SHARE}% to Entrepreneur, {INVESTOR_SHARE}% to Capital Provider
3. DURATION: {DURATION} months
4. PROFIT DISTRIBUTION: Distributed at end of term or quarterly
5. LOSS: Capital Provider bears financial loss; Entrepreneur bears effort loss
6. REPORTING: Mudarib provides monthly business reports to Rab-ul-Mal
7. SHARIAH COMPLIANCE: Reviewed and approved per Islamic finance principles

Signatures:
___________________          ___________________
Capital Provider              Entrepreneur

Shariah Review: {SHARIAH_STATUS}`,

  MUSHARAKAH: `ISLAMIC FINANCE CONTRACT — MUSHARAKAH

This agreement is entered into on {DATE} between:

Partner 1: {LENDER_NAME}
Partner 2: {BORROWER_NAME}

1. CAPITAL CONTRIBUTION: ₹{AMOUNT}
2. PROFIT SHARING: {PROFIT_SHARE}% each
3. DURATION: {DURATION} months
4. OWNERSHIP: Joint ownership of the venture/project
5. DECISIONS: Major decisions require mutual consent
6. EXIT: Either partner may exit with 30 days written notice
7. SHARIAH COMPLIANCE: Reviewed and approved per Islamic finance principles

Signatures:
___________________          ___________________
Partner 1                     Partner 2

Shariah Review: {SHARIAH_STATUS}`,

  MURABAHAH: `ISLAMIC FINANCE CONTRACT — MURABAHAH

This agreement is entered into on {DATE} between:

Seller: {LENDER_NAME}
Buyer: {BORROWER_NAME}

1. ASSET: {ASSET_DESCRIPTION}
2. PURCHASE PRICE: ₹{PURCHASE_PRICE}
3. SALE PRICE: ₹{SALE_PRICE}
4. PROFIT MARGIN: ₹{PROFIT_MARGIN} ({MARGIN_PERCENT}%)
5. PAYMENT: {DURATION} monthly installments
6. OWNERSHIP: Transfers to Buyer upon full payment
7. LATE PAYMENT: Late fees apply as per agreed terms
8. SHARIAH COMPLIANCE: Reviewed and approved per Islamic finance principles

Signatures:
___________________          ___________________
Seller                        Buyer

Shariah Review: {SHARIAH_STATUS}`,

  IJARAH: `ISLAMIC FINANCE CONTRACT — IJARAH

This agreement is entered into on {DATE} between:

Lessor (Owner): {LENDER_NAME}
Lessee (User): {BORROWER_NAME}

1. ASSET: {ASSET_DESCRIPTION}
2. ASSET VALUE: ₹{AMOUNT}
3. LEASE PAYMENT: ₹{LEASE_PAYMENT} per month
4. DURATION: {DURATION} months
5. MAINTENANCE: Lessee responsible for routine maintenance
6. INSURANCE: Asset insured by Lessor, cost shared {INSURANCE_SHARE}
7. TRANSFER OF OWNERSHIP: Option to purchase at end of lease term
8. SHARIAH COMPLIANCE: Reviewed and approved per Islamic finance principles

Signatures:
___________________          ___________________
Lessor                        Lessee

Shariah Review: {SHARIAH_STATUS}`,
};

const INITIAL_FORM = {
  title: '',
  contractType: 'QARD_HASAN',
  content: '',
  principalAmount: '',
  partnerName: '',
  durationMonths: '12',
  profitSharePercent: '50',
  assetDescription: '',
  additionalTerms: '',
};

export default function ContractsPage() {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const { data, pagination, loading, error, refetch, setPage } = useAdminList<ContractTemplate>({
    path: `${prefix}/contracts`,
    limit: 20,
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const dismissBanner = useCallback(() => setBanner(null), []);

  useEffect(() => {
    if (banner) {
      const t = setTimeout(dismissBanner, 4000);
      return () => clearTimeout(t);
    }
  }, [banner, dismissBanner]);

  const updateField = (field: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'contractType' && !editingId) {
        next.content = DEFAULT_CONTENTS[value] || '';
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setFormLoading(true);
    setFormError('');
    try {
      await api(`${prefix}/contracts`, {
        method: 'POST',
        body: {
          title: form.title,
          contractType: form.contractType,
          content: form.content,
          principalAmount: form.principalAmount || undefined,
          partnerName: form.partnerName || undefined,
          durationMonths: form.durationMonths || undefined,
          profitSharePercent: form.profitSharePercent || undefined,
          assetDescription: form.assetDescription || undefined,
          additionalTerms: form.additionalTerms || undefined,
        },
      });
      setBanner({ type: 'success', message: editingId ? 'Contract updated.' : 'Contract created.' });
      setForm(INITIAL_FORM);
      setShowForm(false);
      setEditingId(null);
      refetch();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save contract.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (item: ContractTemplate) => {
    setForm({
      title: item.title,
      contractType: item.contractType,
      content: item.content,
      principalAmount: item.principalAmount || '',
      partnerName: item.partnerName || '',
      durationMonths: item.durationMonths || '12',
      profitSharePercent: item.profitSharePercent || '50',
      assetDescription: item.assetDescription || '',
      additionalTerms: item.additionalTerms || '',
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api(`${prefix}/contracts/${id}`, { method: 'DELETE' });
      setBanner({ type: 'success', message: 'Contract deleted.' });
      refetch();
    } catch {
      setBanner({ type: 'error', message: 'Failed to delete contract.' });
    }
    setDeleteId(null);
  };

  const handleDownload = (item: ContractTemplate, format: 'text' | 'image') => {
    const contractText = item.content
      .replace('{DATE}', new Date(item.createdAt).toLocaleDateString())
      .replace('{LENDER_NAME}', 'Lender')
      .replace('{BORROWER_NAME}', item.partnerName || 'Party B')
      .replace('{AMOUNT}', item.principalAmount || '0')
      .replace('{DURATION}', item.durationMonths || '12')
      .replace('{PROFIT_SHARE}', item.profitSharePercent || '50')
      .replace('{INVESTOR_SHARE}', String(100 - parseInt(item.profitSharePercent || '50')))
      .replace('{ASSET_DESCRIPTION}', item.assetDescription || 'N/A')
      .replace('{PURCHASE_PRICE}', item.principalAmount || '0')
      .replace('{SALE_PRICE}', '0')
      .replace('{PROFIT_MARGIN}', '0')
      .replace('{MARGIN_PERCENT}', '0')
      .replace('{LEASE_PAYMENT}', '0')
      .replace('{INSTALLMENT}', '0')
      .replace('{INSURANCE_SHARE}', '50%')
      .replace('{SHARIAH_STATUS}', 'PENDING')
      + (item.additionalTerms ? `\n\nAdditional Terms:\n${item.additionalTerms}` : '');

    if (format === 'text') {
      const blob = new Blob([contractText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.title.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const lines = contractText.split('\n');
      const lineHeight = 24;
      const padding = 40;
      const maxWidth = 800;
      canvas.width = maxWidth + padding * 2;
      canvas.height = padding * 2 + lines.length * lineHeight;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#1a1a1a';
      ctx.font = '14px Georgia, serif';

      lines.forEach((line, i) => {
        ctx.fillText(line, padding, padding + i * lineHeight + lineHeight);
      });

      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${item.title.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
    }
  };

  const columns = [
    {
      key: 'title', label: 'Contract',
      render: (item: ContractTemplate) => (
        <div>
          <span className="font-medium text-slate-900">{item.title}</span>
          <p className="text-xs text-slate-400 mt-0.5">{new Date(item.createdAt).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      key: 'contractType', label: 'Type',
      render: (item: ContractTemplate) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          {item.contractType.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'principalAmount', label: 'Amount',
      render: (item: ContractTemplate) => (
        <span className="text-sm font-medium text-slate-900">{item.principalAmount ? `₹${item.principalAmount}` : '-'}</span>
      ),
    },
    { key: 'partnerName', label: 'Partner', render: (item: ContractTemplate) => <span className="text-sm text-slate-600">{item.partnerName || '-'}</span> },
    { key: 'status', label: 'Status', render: (item: ContractTemplate) => <StatusBadge status={item.status} /> },
    {
      key: 'actions', label: '', className: 'text-right',
      render: (item: ContractTemplate) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => setPreviewId(previewId === item.id ? null : item.id)} className="text-xs font-medium text-teal-600 hover:text-teal-700 px-2 py-1 rounded hover:bg-teal-50 transition-colors">
            View
          </button>
          <button onClick={() => handleEdit(item)} className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors">
            Edit
          </button>
          <button onClick={() => handleDownload(item, 'text')} className="text-xs font-medium text-slate-600 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-50 transition-colors">
            TXT
          </button>
          <button onClick={() => handleDownload(item, 'image')} className="text-xs font-medium text-slate-600 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-50 transition-colors">
            IMG
          </button>
          <button onClick={() => setDeleteId(item.id)} className="text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors">
            Del
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Finance Contracts" navItems={communityNav} navTitle="Community">
      {banner && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 ${banner.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <span className="flex-1">{banner.message}</span>
          <button onClick={dismissBanner} className="text-current opacity-60 hover:opacity-100">&times;</button>
        </div>
      )}

      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Contracts ({pagination?.total ?? data.length})</h2>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-400 hidden sm:block">Updated {lastRefreshed.toLocaleTimeString()}</span>
            <button onClick={() => { refetch(); setLastRefreshed(new Date()); }} className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">↻</button>
            <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(INITIAL_FORM); }} className="px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 shadow-sm transition-colors">
              {showForm ? 'Cancel' : '+ Create Contract'}
            </button>
          </div>
        </div>

        {showForm && (
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-slate-900 mb-4">{editingId ? 'Edit Contract' : 'Create New Contract'}</h3>
              {formError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{formError}</div>}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select value={form.contractType} onChange={(e) => updateField('contractType', e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none">
                    {CONTRACT_TYPES.map((ct) => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                  </select>
                  <input value={form.title} onChange={(e) => updateField('title', e.target.value)} placeholder="Contract title *" className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                  <input value={form.partnerName} onChange={(e) => updateField('partnerName', e.target.value)} placeholder="Partner name" className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input value={form.principalAmount} onChange={(e) => updateField('principalAmount', e.target.value)} placeholder="Amount (₹)" type="number" min="0" className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                  <input value={form.durationMonths} onChange={(e) => updateField('durationMonths', e.target.value)} placeholder="Duration (months)" type="number" min="1" className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                  <input value={form.profitSharePercent} onChange={(e) => updateField('profitSharePercent', e.target.value)} placeholder="Profit share %" type="number" min="0" max="100" className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                </div>
                {(form.contractType === 'MURABAHAH' || form.contractType === 'IJARAH') && (
                  <input value={form.assetDescription} onChange={(e) => updateField('assetDescription', e.target.value)} placeholder="Asset description" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                )}
                <textarea
                  ref={contentRef}
                  value={form.content}
                  onChange={(e) => updateField('content', e.target.value)}
                  rows={15}
                  placeholder="Contract content..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono resize-y"
                />
                <textarea value={form.additionalTerms} onChange={(e) => updateField('additionalTerms', e.target.value)} rows={3} placeholder="Additional terms (optional)" className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none resize-none" />
                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => { setShowForm(false); setEditingId(null); setForm(INITIAL_FORM); }} className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                  <button onClick={handleCreate} disabled={formLoading || !form.title.trim() || !form.content.trim()} className="px-5 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 disabled:opacity-50 transition-colors">
                    {formLoading ? 'Saving...' : editingId ? 'Update Contract' : 'Create Contract'}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="bg-white rounded-xl border border-slate-100">
          <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No contracts yet. Create one to get started." onRetry={refetch} />
          {pagination && <div className="px-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>}
        </div>
      </div>

      {previewId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setPreviewId(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const item = data.find((d) => d.id === previewId);
              if (!item) return null;
              return (
                <>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-500 mb-4">{item.contractType.replace(/_/g, ' ')} — {new Date(item.createdAt).toLocaleDateString()}</p>
                  <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono bg-slate-50 p-4 rounded-xl border border-slate-200">{item.content}</pre>
                  <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => handleDownload(item, 'text')} className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Download TXT</button>
                    <button onClick={() => handleDownload(item, 'image')} className="px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700">Download Image</button>
                    <button onClick={() => setPreviewId(null)} className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Close</button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Contract</h3>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete this contract? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
              <button onClick={() => handleDelete(deleteId)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
