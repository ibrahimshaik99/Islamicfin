import { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { communityNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { LoadingState, ErrorState, Card, CardContent } from '../../components/ui';
import { useAdminList, DataTable, Pagination, SearchInput } from '../../components/admin/AdminComponents';

export default function MarketplacePage() {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data, pagination, loading, error, refetch, setPage, setFilters, setSearch: setServerSearch } = useAdminList<Record<string, unknown>>({
    path: `${prefix}/products`,
    limit: 20,
    filters: categoryFilter ? { category: categoryFilter } : {},
  });

  const handleSearch = (v: string) => { setSearch(v); setServerSearch(v); };

  const handleCategoryChange = (value: string) => {
    setCategoryFilter(value);
    setFilters(value ? { category: value } : {});
  };

  const columns = [
    { key: 'image', label: '', render: (item: Record<string, unknown>) => {
      const images = item.images as { url: string }[] | undefined;
      const imgUrl = images?.[0]?.url;
      return imgUrl ? (
        <img src={imgUrl} alt={String(item.name)} className="w-10 h-10 rounded-lg object-cover border border-gray-200"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-sm">📦</div>
      );
    }},
    { key: 'name', label: 'Product' },
    { key: 'category', label: 'Category', render: (item: Record<string, unknown>) => (
      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{String(item.category || '-')}</span>
    )},
    { key: 'price', label: 'Price', render: (item: Record<string, unknown>) => (
      <span className="text-sm font-medium text-gray-900">₹{String(item.price)}</span>
    )},
    { key: 'stockQuantity', label: 'Stock', render: (item: Record<string, unknown>) => (
      <span className={`text-sm font-medium ${Number(item.stockQuantity) === 0 ? 'text-red-600' : Number(item.stockQuantity) < 5 ? 'text-amber-600' : 'text-gray-600'}`}>
        {String(item.stockQuantity)}
      </span>
    )},
    { key: 'status', label: 'Status', render: (item: Record<string, unknown>) => (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        item.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
        item.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700' :
        item.status === 'OUT_OF_STOCK' ? 'bg-red-100 text-red-700' :
        'bg-gray-100 text-gray-700'
      }`}>{String(item.status).replace(/_/g, ' ')}</span>
    )},
    { key: 'merchantName', label: 'Merchant', render: (item: Record<string, unknown>) => (
      <span className="text-sm text-gray-500">{String(item.merchantName || '-')}</span>
    )},
    { key: 'createdAt', label: 'Created', render: (item: Record<string, unknown>) => (
      <span className="text-sm text-gray-500">{item.createdAt ? new Date(String(item.createdAt)).toLocaleDateString() : '-'}</span>
    )},
  ];

  return (
    <DashboardLayout title="Marketplace" navItems={communityNav} navTitle="Community">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Community Marketplace ({data.length} products)</h2>
            <div className="flex items-center gap-3">
              <SearchInput value={search} onChange={handleSearch} placeholder="Search products..." />
              <select value={categoryFilter} onChange={(e) => handleCategoryChange(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-2">
                <option value="">All Categories</option>
                <option value="FOOD">Food</option>
                <option value="CLOTHING">Clothing</option>
                <option value="ELECTRONICS">Electronics</option>
                <option value="HOME">Home</option>
                <option value="OTHER">Other</option>
              </select>
              <button onClick={() => refetch()} className="text-xs text-primary-600 hover:text-primary-700">Refresh</button>
            </div>
          </div>
          <Card>
            <CardContent>
              <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No products in marketplace" />
              {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
