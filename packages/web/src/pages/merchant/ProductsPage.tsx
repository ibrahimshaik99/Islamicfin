import { useState, useMemo, useCallback } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { merchantNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../lib/useApi';
import { useMerchantProfile } from '../../lib/useMerchantProfile';
import { LoadingState, ErrorState, Button, Input, Select, Card, CardContent } from '../../components/ui';
import { useAdminList, StatusBadge, Pagination, ConfirmDialog, SearchInput } from '../../components/admin/AdminComponents';

interface ProductImage {
  id: string;
  url: string;
  sortOrder: number;
}

interface Product {
  id: string;
  merchantId: string;
  name: string;
  description: string | null;
  price: string;
  salePrice: string | null;
  sku: string | null;
  stockQuantity: number;
  categoryId: string | null;
  status: string;
  images?: ProductImage[];
  createdAt: string;
  [key: string]: unknown;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  status: string;
  [key: string]: unknown;
}

interface ProductForm {
  name: string;
  description: string;
  price: string;
  salePrice: string;
  sku: string;
  stockQuantity: string;
  categoryId: string;
  status: string;
  imageUrls: string[];
}

const EMPTY_FORM: ProductForm = {
  name: '',
  description: '',
  price: '',
  salePrice: '',
  sku: '',
  stockQuantity: '0',
  categoryId: '',
  status: 'DRAFT',
  imageUrls: [],
};

export default function ProductsPage() {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';

  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const { mutate, loading: mutating, error: mutateError } = useMutation();
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const { merchant, loading: merchantLoading, refetch: refetchMerchant } = useMerchantProfile();
  const { data: categories = [] } = useApi<Category[]>(`${prefix}/categories`);

  const { data, pagination, loading, error, refetch, setPage } = useAdminList<Product>({
    path: `${prefix}/products`,
    limit: 20,
    search,
  });



  const handleManualRefresh = useCallback(() => {
    refetch();
    refetchMerchant();
    setLastRefreshed(new Date());
  }, [refetch, refetchMerchant]);

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories?.forEach((c) => { map[c.id] = c.name; });
    return map;
  }, [categories]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    setFormError('');
    setFormSuccess('');
  };

  const handleEdit = (product: Product) => {
    setForm({
      name: product.name,
      description: product.description || '',
      price: product.price,
      salePrice: product.salePrice || '',
      sku: product.sku || '',
      stockQuantity: String(product.stockQuantity),
      categoryId: product.categoryId || '',
      status: product.status,
      imageUrls: product.images?.map((img) => img.url) || [],
    });
    setEditingId(product.id);
    setShowForm(true);
    setFormError('');
    setFormSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.price || !merchant) return;
    setFormError('');
    setFormSuccess('');

    let result;
    const imagesPayload = form.imageUrls.filter((u) => u.trim());
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: form.price,
      salePrice: form.salePrice || undefined,
      sku: form.sku.trim() || undefined,
      categoryId: form.categoryId || undefined,
      status: form.status,
    };
    if (imagesPayload.length > 0) {
      body.images = imagesPayload;
    } else {
      body.images = [];
    }
    if (editingId) {
      result = await mutate(`${prefix}/products/${editingId}`, {
        method: 'PATCH',
        body,
      });
    } else {
      result = await mutate(`${prefix}/products`, {
        body: { ...body, merchantId: merchant.id, stockQuantity: parseInt(form.stockQuantity, 10) || 0 },
      });
    }

    if (result) {
      setFormSuccess(editingId ? 'Product updated successfully!' : 'Product created successfully!');
      resetForm();
      refetch();
      setTimeout(() => setFormSuccess(''), 3000);
    } else {
      setFormError(mutateError || 'Failed to save product. Please try again.');
    }
  };

  const handleArchive = async () => {
    if (!archiveTarget) return;
    const result = await mutate(`${prefix}/products/${archiveTarget}`, { method: 'DELETE' });
    setArchiveTarget(null);
    if (result) refetch();
  };

  const getStockColor = (qty: number) => {
    if (qty === 0) return 'text-red-600 font-semibold';
    if (qty <= 5) return 'text-amber-600 font-medium';
    return 'text-emerald-600';
  };

  const columns = [
    {
      key: 'image',
      label: '',
      className: 'w-12',
      render: (item: Product) => {
        const images = item.images as ProductImage[] | undefined;
        const thumb = images?.[0]?.url;
        return thumb ? (
          <img src={thumb} alt="" className="w-10 h-10 rounded-lg object-cover border border-gray-100" />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
        );
      },
    },
    {
      key: 'name',
      label: 'Product',
      render: (item: Product) => (
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
          {item.description && (
            <p className="text-xs text-gray-400 truncate mt-0.5 max-w-[200px]">{item.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'sku',
      label: 'SKU',
      render: (item: Product) => (
        <span className="text-xs font-mono text-gray-500">{item.sku || '—'}</span>
      ),
    },
    {
      key: 'price',
      label: 'Price',
      className: 'text-right',
      render: (item: Product) => (
        <div className="text-right">
          <span className="text-sm font-semibold text-gray-900">₹{item.price}</span>
          {item.salePrice && (
            <p className="text-xs text-emerald-600 font-medium">Sale ₹{item.salePrice}</p>
          )}
        </div>
      ),
    },
    {
      key: 'stockQuantity',
      label: 'Stock',
      className: 'text-center',
      render: (item: Product) => (
        <span className={`text-sm ${getStockColor(item.stockQuantity)}`}>
          {item.stockQuantity}
        </span>
      ),
    },
    {
      key: 'categoryId',
      label: 'Category',
      render: (item: Product) => (
        <span className="text-xs text-gray-500">
          {item.categoryId ? categoryMap[item.categoryId] || '—' : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: Product) => <StatusBadge status={item.status} />,
    },
    {
      key: 'actions',
      label: '',
      className: 'text-right',
      render: (item: Product) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleEdit(item)}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 px-2.5 py-1 rounded-lg hover:bg-primary-50 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => setArchiveTarget(item.id)}
            className="text-xs font-medium text-red-500 hover:text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
          >
            Archive
          </button>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Products" navItems={merchantNav} navTitle="Merchant">
      {merchantLoading && (
        <div className="mb-4 flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-xl px-4 py-3 text-sm animate-in fade-in">
          <span className="h-4 w-4 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin" />
          Loading merchant profile...
        </div>
      )}

      {!merchantLoading && !merchant && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 animate-in fade-in">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">You don&apos;t have a merchant profile yet</p>
              <p className="text-sm text-amber-600 mt-1">Apply to become a merchant and start selling in your community marketplace.</p>
              <a href="/merchant/apply" className="inline-flex items-center gap-1.5 mt-2 text-sm font-medium text-amber-700 hover:text-amber-800 underline underline-offset-2">
                Apply now
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}

      {!merchantLoading && merchant && merchant.verificationStatus === 'SUSPENDED' && (
        <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm bg-red-50 border border-red-200 text-red-700 animate-in fade-in">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          Your merchant profile has been suspended. Please contact your community admin.
        </div>
      )}

      {!merchantLoading && merchant && merchant.verificationStatus === 'REJECTED' && (
        <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm bg-amber-50 border border-amber-200 text-amber-700 animate-in fade-in">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          Your merchant profile was not approved. Please contact your community admin.
        </div>
      )}

      {!merchantLoading && merchant && merchant.verificationStatus === 'PENDING' && (
        <div className="mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm bg-blue-50 border border-blue-200 text-blue-700 animate-in fade-in">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          Your merchant profile is pending approval. You can add products but they won't be visible until approved.
        </div>
      )}

      {loading && !data.length && <LoadingState />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">My Products</h2>
              <p className="text-sm text-gray-500 mt-1">Manage your product catalog and inventory</p>
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
                onClick={() => {
                  if (showForm) resetForm();
                  else { setShowForm(true); setFormError(''); setFormSuccess(''); }
                }}
                variant={showForm ? 'secondary' : 'primary'}
              >
                {showForm ? 'Cancel' : '+ Add Product'}
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
                      <path strokeLinecap="round" strokeLinejoin="round" d={editingId ? 'M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10' : 'M12 4.5v15m7.5-7.5h-15'} />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {editingId ? 'Edit Product' : 'New Product'}
                  </h3>
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
                    <Input
                      label="Product Name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Wireless Earbuds"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Optional product description"
                      rows={2}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <Input
                    label="Price (₹)"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="0.00"
                    type="number"
                    step="0.01"
                    min="0"
                  />
                  <Input
                    label="Sale Price (₹)"
                    value={form.salePrice}
                    onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                    placeholder="Optional"
                    type="number"
                    step="0.01"
                    min="0"
                  />
                  <Input
                    label="SKU"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="e.g. WE-001"
                  />
                  <Input
                    label="Stock Quantity"
                    value={form.stockQuantity}
                    onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })}
                    type="number"
                    min="0"
                  />
                  <Select
                    label="Category"
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    options={[
                      { value: '', label: 'No Category' },
                      ...(categories ?? []).filter((c) => c.status === 'ACTIVE').map((c) => ({ value: c.id, label: c.name })),
                    ]}
                  />
                  <Select
                    label="Status"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    options={[
                      { value: 'DRAFT', label: 'Draft' },
                      { value: 'ACTIVE', label: 'Active' },
                    ]}
                  />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product Images</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3">
                    {form.imageUrls.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={url}
                          alt={`Product ${idx + 1}`}
                          className="w-full aspect-square rounded-xl object-cover border border-gray-200"
                          onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="%23e5e7eb"><rect width="100" height="100"/><text x="50" y="55" text-anchor="middle" fill="%239ca3af" font-size="12">No img</text></svg>'); }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = form.imageUrls.filter((_, i) => i !== idx);
                            setForm({ ...form, imageUrls: updated });
                          }}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                        <span className="absolute bottom-1 left-1 text-[10px] bg-black/50 text-white px-1 rounded">{idx + 1}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {form.imageUrls.length < 10 && (
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-xl hover:bg-teal-100 transition-colors">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        Upload from device
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            files.forEach((file) => {
                              if (form.imageUrls.length >= 10) return;
                              const reader = new FileReader();
                              reader.onload = (ev) => {
                                const img = new Image();
                                img.onload = () => {
                                  const canvas = document.createElement('canvas');
                                  const MAX = 800;
                                  let w = img.width, h = img.height;
                                  if (w > MAX || h > MAX) {
                                    if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                                    else { w = Math.round(w * MAX / h); h = MAX; }
                                  }
                                  canvas.width = w;
                                  canvas.height = h;
                                  canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
                                  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                                  setForm((prev) => ({ ...prev, imageUrls: [...prev.imageUrls, dataUrl] }));
                                };
                                img.src = ev.target?.result as string;
                              };
                              reader.readAsDataURL(file);
                            });
                            e.target.value = '';
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Upload from device. Max 10 images. JPG, PNG, WebP. Auto-compressed to 800px.</p>
                </div>

                <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
                  <Button variant="secondary" onClick={resetForm}>Cancel</Button>
                  <Button onClick={handleSubmit} loading={mutating} disabled={!form.name.trim() || !form.price}>
                    {editingId ? 'Update Product' : 'Create Product'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="max-w-sm">
            <SearchInput value={search} onChange={setSearch} placeholder="Search products..." />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Products', value: pagination?.total ?? data.length, color: 'from-primary-500 to-primary-600' },
              { label: 'Active (page)', value: data.filter((p) => p.status === 'ACTIVE').length, color: 'from-emerald-500 to-emerald-600' },
              { label: 'Draft (page)', value: data.filter((p) => p.status === 'DRAFT').length, color: 'from-amber-500 to-amber-600' },
              { label: 'Out of Stock (page)', value: data.filter((p) => p.stockQuantity === 0).length, color: 'from-red-500 to-red-600' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="relative overflow-hidden rounded-xl bg-white border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all duration-300"
                style={{ animationDelay: `${i * 75}ms` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-[0.04]`} />
                <p className="text-xs font-medium text-gray-500 relative">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1 relative">{stat.value}</p>
              </div>
            ))}
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {columns.map((col) => (
                        <th
                          key={col.key}
                          className={`text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider ${col.className || ''}`}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.length === 0 && !loading ? (
                      <tr>
                        <td colSpan={columns.length} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
                              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">No products yet</p>
                              <p className="text-xs text-gray-500 mt-1">Create your first product to get started</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      data.map((item, i) => (
                        <tr
                          key={item.id}
                          className="hover:bg-gray-50/80 transition-colors duration-150 group"
                          style={{ animationDelay: `${i * 40}ms` }}
                        >
                          {columns.map((col) => (
                            <td key={col.key} className={`py-3.5 px-4 ${col.className || ''}`}>
                              {col.render ? col.render(item) : String(item[col.key as keyof Product] ?? '')}
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

          <ConfirmDialog
            open={!!archiveTarget}
            title="Archive Product"
            message="This product will be archived and hidden from the marketplace. You can restore it later if needed."
            confirmLabel="Archive"
            onConfirm={handleArchive}
            onCancel={() => setArchiveTarget(null)}
            loading={mutating}
          />
        </div>
      )}
    </DashboardLayout>
  );
}
