import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { communityNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { useAdminList, SearchInput, Pagination, DataTable, StatusBadge } from '../../components/admin/AdminComponents';
import { Card, CardContent, Button } from '../../components/ui';

interface DirectoryEntry {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  documentType: string | null;
  financeType: string;
  kametiPreference: string;
  role: string;
  notes: string | null;
  createdAt: string;
  [key: string]: unknown;
}

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'MERCHANT', label: 'Merchant' },
  { value: 'COMMUNITY_ADMIN', label: 'Community Admin' },
  { value: 'COMMUNITY_MODERATOR', label: 'Community Moderator' },
];

const FINANCE_TYPES = ['NONE', 'QARD_HASAN', 'MUDARABAH', 'MUSHARAKAH', 'MURABAHAH', 'IJARAH'];
const KAMETI_OPTIONS = ['YES', 'NO', 'MAYBE'];

const INITIAL_FORM = {
  name: '',
  phone: '',
  address: '',
  email: '',
  documentType: '',
  financeType: 'NONE',
  kametiPreference: 'NO',
  role: 'CUSTOMER',
  notes: '',
};

export default function CommunityDirectoryPage() {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const { data, pagination, loading, error, refetch, setPage } = useAdminList<DirectoryEntry>({
    path: `${prefix}/directory`,
    search,
    filters: roleFilter ? { role: roleFilter } : {},
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const dismissBanner = useCallback(() => setBanner(null), []);

  useEffect(() => {
    if (banner) {
      const t = setTimeout(dismissBanner, 4000);
      return () => clearTimeout(t);
    }
  }, [banner, dismissBanner]);

  const updateField = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    setFormLoading(true);
    setFormError('');
    try {
      await api(`${prefix}/directory`, {
        method: 'POST',
        body: { ...form, email: form.email || undefined, phone: form.phone || undefined },
      });
      setBanner({ type: 'success', message: 'Directory entry created.' });
      setForm(INITIAL_FORM);
      setShowForm(false);
      refetch();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create entry.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api(`${prefix}/directory/${id}`, { method: 'DELETE' });
      setBanner({ type: 'success', message: 'Entry deleted.' });
      refetch();
    } catch {
      setBanner({ type: 'error', message: 'Failed to delete entry.' });
    }
    setDeleteId(null);
  };

  const handleBulkImport = async () => {
    if (!bulkText.trim()) return;
    setBulkLoading(true);
    try {
      const lines = bulkText.trim().split('\n');
      const header = lines[0].split('\t').map((h) => h.trim());
      const entries = lines.slice(1).map((line) => {
        const values = line.split('\t');
        const entry: Record<string, string> = {};
        header.forEach((h, i) => { entry[h] = values[i] || ''; });
        return entry;
      });
      const result = await api<{ data: { count: number } }>(`${prefix}/directory/bulk`, {
        method: 'POST',
        body: { entries },
      });
      setBanner({ type: 'success', message: `Imported ${result.data.count} entries.` });
      setShowBulk(false);
      setBulkText('');
      refetch();
    } catch (err: unknown) {
      setBanner({ type: 'error', message: err instanceof Error ? err.message : 'Bulk import failed.' });
    } finally {
      setBulkLoading(false);
    }
  };

  const columns = [
    {
      key: 'name', label: 'Name',
      render: (item: DirectoryEntry) => (
        <div>
          <span className="font-medium text-slate-900">{item.name}</span>
          {item.email && <p className="text-xs text-slate-400">{item.email}</p>}
        </div>
      ),
    },
    { key: 'phone', label: 'Phone', render: (item: DirectoryEntry) => <span className="text-sm text-slate-600">{item.phone || '-'}</span> },
    { key: 'address', label: 'Address', render: (item: DirectoryEntry) => <span className="text-sm text-slate-500 truncate max-w-[150px] block">{item.address || '-'}</span> },
    { key: 'role', label: 'Type', render: (item: DirectoryEntry) => <StatusBadge status={item.role} /> },
    {
      key: 'financeType', label: 'Finance',
      render: (item: DirectoryEntry) => (
        <span className={`text-xs font-medium ${item.financeType === 'NONE' ? 'text-slate-400' : 'text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full'}`}>
          {item.financeType === 'NONE' ? '-' : item.financeType.replace(/_/g, ' ')}
        </span>
      ),
    },
    {
      key: 'kametiPreference', label: 'Kameti',
      render: (item: DirectoryEntry) => (
        <span className={`text-xs font-medium ${item.kametiPreference === 'YES' ? 'text-green-700 bg-green-50 px-2 py-0.5 rounded-full' : item.kametiPreference === 'MAYBE' ? 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full' : 'text-slate-400'}`}>
          {item.kametiPreference}
        </span>
      ),
    },
    {
      key: 'actions', label: '', className: 'text-right',
      render: (item: DirectoryEntry) => (
        <button
          onClick={() => setDeleteId(item.id)}
          className="text-xs font-medium text-red-600 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors"
        >
          Delete
        </button>
      ),
    },
  ];

  return (
    <DashboardLayout title="Community Directory" navItems={communityNav} navTitle="Community">
      {banner && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-3 ${banner.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          <span className="flex-1">{banner.message}</span>
          <button onClick={dismissBanner} className="text-current opacity-60 hover:opacity-100">&times;</button>
        </div>
      )}

      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search directory..." /></div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-400 hidden sm:block">Updated {lastRefreshed.toLocaleTimeString()}</span>
            <button onClick={() => { refetch(); setLastRefreshed(new Date()); }} className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">↻</button>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:ring-2 focus:ring-teal-500 outline-none">
              {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={() => setShowBulk(!showBulk)} className="px-3 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-xl hover:bg-slate-200 transition-colors whitespace-nowrap">
              Bulk Import
            </button>
            <button onClick={() => setShowForm(!showForm)} className="px-4 py-2.5 text-sm font-medium text-white bg-teal-600 rounded-xl hover:bg-teal-700 shadow-sm transition-colors whitespace-nowrap">
              {showForm ? 'Cancel' : '+ Add Entry'}
            </button>
          </div>
        </div>

        {showBulk && (
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Bulk Import (Tab-Separated)</h3>
              <p className="text-xs text-slate-500 mb-3">Paste tab-separated data with headers: Name, Phone, Address, Email, Document Type, Finance Type, Kameti, User Type, Notes</p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={6}
                placeholder={"Name\tPhone\tAddress\tEmail\tFinance Type\tKameti\tUser Type\nAhmed Khan\t9876543210\tMumbai\tahmed@test.com\tQARD_HASAN\tYES\tMERCHANT"}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none font-mono resize-none"
              />
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => { setShowBulk(false); setBulkText(''); }} className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
                <button onClick={handleBulkImport} disabled={bulkLoading || !bulkText.trim()} className="px-4 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50">
                  {bulkLoading ? 'Importing...' : 'Import'}
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {showForm && (
          <Card>
            <CardContent>
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Add Directory Entry</h3>
              {formError && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{formError}</div>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Name *" className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="Phone" className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                <input value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="Email (optional)" className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                <input value={form.address} onChange={(e) => updateField('address', e.target.value)} placeholder="Address" className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                <input value={form.documentType} onChange={(e) => updateField('documentType', e.target.value)} placeholder="Document Type (e.g. Aadhaar)" className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none" />
                <select value={form.role} onChange={(e) => updateField('role', e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none">
                  <option value="CUSTOMER">Customer</option>
                  <option value="MERCHANT">Merchant</option>
                  <option value="COMMUNITY_ADMIN">Community Admin</option>
                  <option value="COMMUNITY_MODERATOR">Community Moderator</option>
                </select>
                <select value={form.financeType} onChange={(e) => updateField('financeType', e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none">
                  {FINANCE_TYPES.map((ft) => <option key={ft} value={ft}>{ft === 'NONE' ? 'No Finance' : ft.replace(/_/g, ' ')}</option>)}
                </select>
                <select value={form.kametiPreference} onChange={(e) => updateField('kametiPreference', e.target.value)} className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none">
                  {KAMETI_OPTIONS.map((k) => <option key={k} value={k}>{k === 'YES' ? 'Yes - Interested' : k === 'MAYBE' ? 'Maybe' : 'No'}</option>)}
                </select>
              </div>
              <textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} rows={2} placeholder="Notes (optional)" className="w-full mt-3 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none resize-none" />
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => { setShowForm(false); setForm(INITIAL_FORM); }} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
                <Button variant="primary" size="sm" onClick={handleCreate} loading={formLoading}>Create Entry</Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="bg-white rounded-xl border border-slate-100">
          <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No directory entries yet" onRetry={refetch} />
          {pagination && <div className="px-4"><Pagination pagination={pagination} onPageChange={setPage} /></div>}
        </div>
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Entry</h3>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete this directory entry?</p>
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
