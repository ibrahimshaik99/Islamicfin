import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { adminNav } from '../../lib/navigation';
import { useAdminList, SearchInput, Pagination, StatusBadge } from '../../components/admin/AdminComponents';

interface DirectoryEntry {
  id: string;
  communityId: string;
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
  communityName: string | null;
  [key: string]: unknown;
}

interface Community {
  id: string;
  name: string;
}

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'CUSTOMER', label: 'Customer' },
  { value: 'MERCHANT', label: 'Merchant' },
  { value: 'COMMUNITY_ADMIN', label: 'Community Admin' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Finance Types' },
  { value: 'QARD_HASAN', label: 'Qard Hasan' },
  { value: 'MUDARABAH', label: 'Mudarabah' },
  { value: 'MUSHARAKAH', label: 'Musharakah' },
  { value: 'MURABAHAH', label: 'Murabahah' },
  { value: 'IJARAH', label: 'Ijarah' },
  { value: 'NONE', label: 'No Finance' },
];

export default function AdminDirectoryPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [communityFilter, setCommunityFilter] = useState('');
  const [financeFilter, setFinanceFilter] = useState('');
  const [communities, setCommunities] = useState<Community[]>([]);
  const { data, pagination, loading, error, refetch, setPage } = useAdminList<DirectoryEntry>({
    path: '/admin/directory',
    search,
    filters: {
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(communityFilter ? { communityId: communityFilter } : {}),
    },
  });
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [selectedEntry, setSelectedEntry] = useState<DirectoryEntry | null>(null);

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const res = await fetch('/api/v1/admin/communities?limit=100', { credentials: 'include' });
        const json = await res.json();
        setCommunities(json.data || []);
      } catch { /* ignore */ }
    };
    fetchCommunities();
  }, []);

  const filteredData = financeFilter
    ? data.filter((d) => d.financeType === financeFilter)
    : data;

  const columns = [
    {
      key: 'communityName', label: 'Community',
      render: (item: DirectoryEntry) => (
        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{item.communityName || 'Unknown'}</span>
      ),
    },
    {
      key: 'name', label: 'Name',
      render: (item: DirectoryEntry) => (
        <div>
          <button onClick={() => setSelectedEntry(item)} className="font-medium text-slate-900 hover:text-teal-600 transition-colors text-left">
            {item.name}
          </button>
          {item.email && <p className="text-xs text-slate-400">{item.email}</p>}
        </div>
      ),
    },
    {
      key: 'phone', label: 'Phone',
      render: (item: DirectoryEntry) => <span className="text-sm text-slate-600">{item.phone || '-'}</span>,
    },
    {
      key: 'address', label: 'Address',
      render: (item: DirectoryEntry) => <span className="text-sm text-slate-500 truncate max-w-[140px] block">{item.address || '-'}</span>,
    },
    {
      key: 'role', label: 'Type',
      render: (item: DirectoryEntry) => <StatusBadge status={item.role} />,
    },
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
      key: 'createdAt', label: 'Added',
      render: (item: DirectoryEntry) => <span className="text-xs text-slate-400">{new Date(item.createdAt).toLocaleDateString()}</span>,
    },
  ];

  const communityStats = data.reduce<Record<string, { name: string; count: number }>>((acc, entry) => {
    const cid = entry.communityId;
    if (!acc[cid]) acc[cid] = { name: entry.communityName || 'Unknown', count: 0 };
    acc[cid].count++;
    return acc;
  }, {});

  return (
    <DashboardLayout title="All Directory Data" navItems={adminNav} navTitle="Super Admin">
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">View all user/merchant directory entries across all communities. Community owners can only see their own.</p>
        </div>

        {/* Community Stats Cards */}
        {Object.keys(communityStats).length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(communityStats).map(([cid, stats]) => (
              <button
                key={cid}
                onClick={() => setCommunityFilter(communityFilter === cid ? '' : cid)}
                className={`text-left p-3 rounded-xl border transition-all ${
                  communityFilter === cid
                    ? 'bg-teal-50 border-teal-300 shadow-sm'
                    : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                }`}
              >
                <p className="text-lg font-bold text-slate-900">{stats.count}</p>
                <p className="text-xs text-slate-500 truncate">{stats.name}</p>
              </button>
            ))}
            {communityFilter && (
              <button
                onClick={() => setCommunityFilter('')}
                className="text-left p-3 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 transition-colors"
              >
                <p className="text-xs text-slate-500 mt-2">Clear Filter</p>
              </button>
            )}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1"><SearchInput value={search} onChange={setSearch} placeholder="Search by name, email, phone..." /></div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-400 hidden sm:block">Updated {lastRefreshed.toLocaleTimeString()}</span>
            <button onClick={() => { refetch(); setLastRefreshed(new Date()); }} className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">↻</button>
            <select value={communityFilter} onChange={(e) => setCommunityFilter(e.target.value)} className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:ring-2 focus:ring-teal-500 outline-none">
              <option value="">All Communities</option>
              {communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:ring-2 focus:ring-teal-500 outline-none">
              {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={financeFilter} onChange={(e) => setFinanceFilter(e.target.value)} className="text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:ring-2 focus:ring-teal-500 outline-none">
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {columns.map((col) => (
                    <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">Loading...</td></tr>
                ) : error ? (
                  <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-red-400">{error}</td></tr>
                ) : filteredData.length === 0 ? (
                  <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400">No directory entries found</td></tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-3">
                          {col.render(item)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {pagination && <div className="px-4 py-3 border-t border-slate-100"><Pagination pagination={pagination} onPageChange={setPage} /></div>}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedEntry(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">{selectedEntry.name}</h3>
              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{selectedEntry.communityName}</span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="text-slate-900">{selectedEntry.phone || '-'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="text-slate-900">{selectedEntry.email || '-'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Address</span><span className="text-slate-900 text-right max-w-[200px]">{selectedEntry.address || '-'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">User Type</span><StatusBadge status={selectedEntry.role} /></div>
              <div className="flex justify-between"><span className="text-slate-500">Finance Type</span><span className="text-slate-900">{selectedEntry.financeType.replace(/_/g, ' ')}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Kameti</span><span className="text-slate-900">{selectedEntry.kametiPreference}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Document</span><span className="text-slate-900">{selectedEntry.documentType || '-'}</span></div>
              {selectedEntry.notes && (
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-slate-500 block mb-1">Notes</span>
                  <p className="text-slate-700 text-xs bg-slate-50 p-2 rounded">{selectedEntry.notes}</p>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-slate-100"><span className="text-slate-500">Added</span><span className="text-slate-900">{new Date(selectedEntry.createdAt).toLocaleString()}</span></div>
            </div>
            <button onClick={() => setSelectedEntry(null)} className="w-full mt-4 px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Close</button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
