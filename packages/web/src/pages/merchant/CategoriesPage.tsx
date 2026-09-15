import { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { merchantNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useMutation } from '../../lib/useApi';
import { LoadingState, ErrorState, Button, Input, Card, CardContent } from '../../components/ui';
import { useAdminList, StatusBadge, Pagination, ConfirmDialog, SearchInput } from '../../components/admin/AdminComponents';

interface Category {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  [key: string]: unknown;
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function CategoriesPage() {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{ id: string; action: 'enable' | 'disable' } | null>(null);
  const [search, setSearch] = useState('');
  const [editingStatus, setEditingStatus] = useState<string>('ACTIVE');
  const { mutate, loading: mutating } = useMutation();

  const { data, pagination, loading, error, refetch, setPage } = useAdminList<Category>({
    path: `${prefix}/categories`,
    limit: 20,
    search,
  });

  const resetForm = () => {
    setName('');
    setSlug('');
    setSlugEdited(false);
    setEditingId(null);
    setShowForm(false);
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugEdited) {
      setSlug(slugify(value));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugEdited(true);
    setSlug(value);
  };

  const handleEdit = (cat: Category) => {
    setName(cat.name);
    setSlug(cat.slug);
    setSlugEdited(true);
    setEditingId(cat.id);
    setEditingStatus(cat.status);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (!name.trim() || !slug.trim()) return;

    let result;
    if (editingId) {
      result = await mutate(`${prefix}/categories/${editingId}`, {
        method: 'PATCH',
        body: { name: name.trim(), status: editingStatus },
      });
    } else {
      result = await mutate(`${prefix}/categories`, {
        body: { name: name.trim(), slug: slug.trim() },
      });
    }
    if (result) {
      resetForm();
      refetch();
    }
  };

  const handleStatusToggle = async () => {
    if (!statusTarget) return;
    const newStatus = statusTarget.action === 'enable' ? 'ACTIVE' : 'DISABLED';
    const result = await mutate(`${prefix}/categories/${statusTarget.id}`, {
      method: 'PATCH',
      body: { status: newStatus },
    });
    setStatusTarget(null);
    if (result) refetch();
  };

  const columns = [
    {
      key: 'name',
      label: 'Category',
      render: (item: Category) => (
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center flex-shrink-0">
            <svg className="h-4 w-4 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
            <p className="text-xs text-gray-400 font-mono truncate">/{item.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'slug',
      label: 'Slug',
      render: (item: Category) => (
        <span className="text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded">/{item.slug}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (item: Category) => <StatusBadge status={item.status} />,
    },
    {
      key: 'actions',
      label: '',
      className: 'text-right',
      render: (item: Category) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => handleEdit(item)}
            className="text-xs font-medium text-primary-600 hover:text-primary-700 px-2.5 py-1 rounded-lg hover:bg-primary-50 transition-colors"
          >
            Edit
          </button>
          {item.status === 'ACTIVE' ? (
            <button
              onClick={() => setStatusTarget({ id: item.id, action: 'disable' })}
              className="text-xs font-medium text-red-500 hover:text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
            >
              Disable
            </button>
          ) : (
            <button
              onClick={() => setStatusTarget({ id: item.id, action: 'enable' })}
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 px-2.5 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              Enable
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout title="Categories" navItems={merchantNav} navTitle="Merchant">
      {loading && !data.length && <LoadingState />}
      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Product Categories</h2>
              <p className="text-sm text-gray-500 mt-1">Organize your products into categories</p>
            </div>
            <Button
              onClick={() => {
                if (showForm) resetForm();
                else setShowForm(true);
              }}
              variant={showForm ? 'secondary' : 'primary'}
            >
              {showForm ? 'Cancel' : '+ Add Category'}
            </Button>
          </div>

          {/* Create / Edit Form */}
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
                    {editingId ? 'Edit Category' : 'New Category'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Category Name"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g. Electronics"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-400 flex-shrink-0">/</span>
                      <input
                        type="text"
                        value={slug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        placeholder="electronics"
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono shadow-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-100">
                  <Button variant="secondary" onClick={resetForm}>Cancel</Button>
                  <Button onClick={handleSubmit} loading={mutating} disabled={!name.trim() || !slug.trim()}>
                    {editingId ? 'Update Category' : 'Create Category'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Search */}
          <div className="max-w-sm">
            <SearchInput value={search} onChange={setSearch} placeholder="Search categories..." />
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Categories', value: pagination?.total ?? data.length, color: 'from-primary-500 to-primary-600' },
              { label: 'Active', value: data.filter((c) => c.status === 'ACTIVE').length, color: 'from-emerald-500 to-emerald-600' },
              { label: 'Disabled', value: data.filter((c) => c.status === 'DISABLED').length, color: 'from-gray-400 to-gray-500' },
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

          {/* Categories Table */}
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
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">No categories yet</p>
                              <p className="text-xs text-gray-500 mt-1">Create your first category to organize products</p>
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
                              {col.render ? col.render(item) : String(item[col.key as keyof Category] ?? '')}
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

          {/* Status Confirm */}
          <ConfirmDialog
            open={!!statusTarget}
            title={statusTarget?.action === 'enable' ? 'Enable Category' : 'Disable Category'}
            message={
              statusTarget?.action === 'enable'
                ? 'This category will be visible and available for product assignment.'
                : 'This category will be hidden. Products in this category will become uncategorized.'
            }
            confirmLabel={statusTarget?.action === 'enable' ? 'Enable' : 'Disable'}
            onConfirm={handleStatusToggle}
            onCancel={() => setStatusTarget(null)}
            loading={mutating}
          />
        </div>
      )}
    </DashboardLayout>
  );
}
