import { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { adminNav } from '../../lib/navigation';
import { api } from '../../lib/api';
import { useApi } from '../../lib/useApi';
import { LoadingState, ErrorState, Card, CardContent, Button, Input } from '../../components/ui';
import { StatusBadge } from '../../components/admin/AdminComponents';

interface CityRow {
  id: string;
  name: string;
  state: string;
  slug: string;
  status: string;
  createdAt: string;
  communityCount: number;
}

export default function CitiesPage() {
  const { data, loading, error, refetch } = useApi<CityRow[]>('/admin/cities');

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', state: '' });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

  const cities = data || [];

  const handleCreate = async () => {
    setCreating(true);
    setCreateError('');
    try {
      await api('/admin/cities', {
        method: 'POST',
        body: { name: createForm.name.trim(), state: createForm.state.trim() },
      });
      setShowCreate(false);
      setCreateForm({ name: '', state: '' });
      refetch();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create city');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleStatus = async (city: CityRow) => {
    setActionId(city.id);
    setActionError('');
    try {
      await api(`/admin/cities/${city.id}`, {
        method: 'PATCH',
        body: { status: city.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' },
      });
      refetch();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to update city');
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (city: CityRow) => {
    if (!window.confirm(`Delete city "${city.name}, ${city.state}"? This cannot be undone.`)) return;
    setActionId(city.id);
    setActionError('');
    try {
      await api(`/admin/cities/${city.id}`, { method: 'DELETE' });
      refetch();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete city');
    } finally {
      setActionId(null);
    }
  };

  return (
    <DashboardLayout title="Cities" navItems={adminNav} navTitle="Admin">
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">City Directory</h2>
            <p className="text-sm text-gray-500">
              Cities gate community onboarding and marketplace visibility. Members can only join or create communities in their city.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap"
          >
            + Add City
          </button>
        </div>

        {actionError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">{actionError}</div>
        )}

        {loading && <LoadingState />}
        {error && <ErrorState message={error} onRetry={refetch} />}
        {!loading && !error && cities.length === 0 && (
          <Card><CardContent><p className="text-sm text-gray-500 text-center py-8">No cities yet. Add the first city.</p></CardContent></Card>
        )}
        {!loading && !error && cities.length > 0 && (
          <div className="space-y-3">
            {cities.map((city) => (
              <Card key={city.id}>
                <CardContent>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {city.name}, {city.state}
                        </p>
                        <p className="text-xs text-gray-500">
                          /{city.slug} · {city.communityCount} {city.communityCount === 1 ? 'community' : 'communities'}
                        </p>
                      </div>
                      <StatusBadge status={city.status} />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(city)}
                        disabled={actionId === city.id}
                        className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                          city.status === 'ACTIVE'
                            ? 'text-red-600 hover:bg-red-50'
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {actionId === city.id ? '...' : city.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDelete(city)}
                        disabled={actionId === city.id || city.communityCount > 0}
                        title={city.communityCount > 0 ? 'City has communities attached — disable it instead' : 'Delete city'}
                        className="text-xs font-medium text-gray-500 hover:text-red-600 px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-500"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowCreate(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add City</h3>
            {createError && <p className="text-sm text-red-600 mb-3">{createError}</p>}
            <div className="space-y-3">
              <Input
                label="City Name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="e.g., Bhopal"
              />
              <Input
                label="State"
                value={createForm.state}
                onChange={(e) => setCreateForm({ ...createForm, state: e.target.value })}
                placeholder="e.g., Madhya Pradesh"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <Button
                onClick={handleCreate}
                disabled={!createForm.name.trim() || !createForm.state.trim() || creating}
              >
                {creating ? 'Adding...' : 'Add City'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
