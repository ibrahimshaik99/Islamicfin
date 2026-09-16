import { useState, useMemo, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { merchantNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../lib/useApi';
import { LoadingState, ErrorState, Input, Card, CardContent, StatCard, Button } from '../../components/ui';
import { useAdminList, DataTable, Pagination } from '../../components/admin/AdminComponents';
import type { Product } from '../../lib/types';

interface Category {
  id: string;
  name: string;
  [key: string]: unknown;
}

export default function InventoryPage() {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [editTarget, setEditTarget] = useState<{ id: string; name: string; stock: number } | null>(null);
  const [newStock, setNewStock] = useState('');
  const [stockError, setStockError] = useState('');
  const { mutate, loading: mutating } = useMutation();
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const { data, pagination, loading, error, refetch, setPage } = useAdminList<Record<string, unknown>>({
    path: `${prefix}/products`,
    limit: 20,
  });

  const { data: categories = [] } = useApi<Category[]>(`${prefix}/categories`);

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories?.forEach((c) => { map[c.id] = c.name; });
    return map;
  }, [categories]);



  const handleManualRefresh = useCallback(() => {
    refetch();
    setLastRefreshed(new Date());
  }, [refetch]);

  const products = (data || []) as unknown as Product[];

  const stats = useMemo(() => {
    const total = products.length;
    const inStock = products.filter((p) => p.stockQuantity > 5).length;
    const lowStock = products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= 5).length;
    const outOfStock = products.filter((p) => p.stockQuantity === 0).length;
    return { total, inStock, lowStock, outOfStock };
  }, [products]);

  const lowStockItems = useMemo(
    () => products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= 5),
    [products]
  );

  const handleUpdateStock = async () => {
    if (!editTarget) return;
    const parsed = parseInt(newStock, 10);
    if (isNaN(parsed) || parsed < 0) {
      setStockError('Stock must be a non-negative number');
      return;
    }
    setStockError('');
    await mutate(`${prefix}/products/${editTarget.id}/inventory`, {
      method: 'PATCH',
      body: { stockQuantity: parsed },
    });
    setEditTarget(null);
    setNewStock('');
    refetch();
  };

  const openEdit = (item: Record<string, unknown>) => {
    setEditTarget({ id: String(item.id), name: String(item.name), stock: Number(item.stockQuantity) });
    setNewStock(String(item.stockQuantity));
    setStockError('');
  };

  const columns = [
    {
      key: 'name',
      label: 'Product',
      render: (item: Record<string, unknown>) => (
        <span className="font-medium text-gray-900">{String(item.name)}</span>
      ),
    },
    {
      key: 'sku',
      label: 'SKU',
      render: (item: Record<string, unknown>) => (
        <span className="text-sm text-gray-500 font-mono">{String(item.sku || '-')}</span>
      ),
    },
    {
      key: 'stockQuantity',
      label: 'Current Stock',
      render: (item: Record<string, unknown>) => {
        const qty = Number(item.stockQuantity);
        return (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              qty === 0
                ? 'bg-red-100 text-red-700'
                : qty <= 5
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-green-100 text-green-700'
            }`}
          >
            {qty}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: Record<string, unknown>) => {
        const qty = Number(item.stockQuantity);
        const status = qty === 0 ? 'OUT_OF_STOCK' : item.status;
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
              status === 'ACTIVE'
                ? 'bg-green-100 text-green-700'
                : status === 'OUT_OF_STOCK'
                  ? 'bg-red-100 text-red-700'
                  : 'bg-gray-100 text-gray-700'
            }`}
          >
            {String(status).replace(/_/g, ' ')}
          </span>
        );
      },
    },
    {
      key: 'category',
      label: 'Category',
      render: (item: Record<string, unknown>) => (
        <span className="text-sm text-gray-500">{item.categoryId ? categoryMap[String(item.categoryId)] || '-' : '-'}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      render: (item: Record<string, unknown>) => (
        <button
          onClick={() => openEdit(item)}
          className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
        >
          Update Stock
        </button>
      ),
    },
  ];

  return (
    <DashboardLayout title="Inventory" navItems={merchantNav} navTitle="Merchant">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
              <p className="mt-1 text-sm text-gray-500">Track and manage your product stock levels</p>
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
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Products"
              value={stats.total}
              color="primary"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                </svg>
              }
            />
            <StatCard
              label="In Stock"
              value={stats.inStock}
              color="green"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="Low Stock"
              value={stats.lowStock}
              color="amber"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              }
            />
            <StatCard
              label="Out of Stock"
              value={stats.outOfStock}
              color="red"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              }
            />
          </div>

          {lowStockItems.length > 0 && (
            <Card>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Low Stock Alerts</h3>
                  <span className="ml-auto text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    {lowStockItems.length} items
                  </span>
                </div>
                <div className="space-y-2">
                  {lowStockItems.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-amber-50/50 border border-amber-100"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-sm font-medium text-gray-900">{p.name}</span>
                        {p.sku && <span className="text-xs text-gray-400 font-mono">({p.sku})</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-amber-700">{p.stockQuantity} left</span>
                        <button
                          onClick={() => openEdit(p as unknown as Record<string, unknown>)}
                          className="text-xs font-medium text-primary-600 hover:text-primary-700"
                        >
                          Restock
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent>
              <DataTable columns={columns} data={data} loading={loading} error={error} emptyMessage="No products to manage" />
              {pagination && <Pagination pagination={pagination} onPageChange={setPage} />}
            </CardContent>
          </Card>

          {editTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Update Stock</h3>
                    <p className="text-sm text-gray-500 truncate max-w-[200px]">{editTarget.name}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">Current Stock</span>
                    <span className="text-sm font-semibold text-gray-900">{editTarget.stock}</span>
                  </div>

                  <div>
                    <Input
                      label="New Stock Quantity"
                      value={newStock}
                      onChange={(e) => {
                        setNewStock(e.target.value);
                        setStockError('');
                      }}
                      type="number"
                      min="0"
                      placeholder="Enter new stock quantity"
                    />
                    {stockError && <p className="mt-1 text-xs text-red-600">{stockError}</p>}
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setEditTarget(null);
                      setNewStock('');
                      setStockError('');
                    }}
                    disabled={mutating}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateStock} loading={mutating}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
