import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { communityNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../lib/useApi';
import { LoadingState, ErrorState, Button, Input, Card, CardContent } from '../../components/ui';
import type { Community } from '../../lib/types';

export default function SettingsPage() {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';

  const { data, loading, error, refetch } = useApi<{ community: Community; stats: Record<string, number> }>(communityId ? `${prefix}/dashboard` : null);
  const { mutate, loading: mutating } = useMutation();

  const community = data?.community;

  const [form, setForm] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    state: '',
    country: '',
    contactPhone: '',
  });

  useEffect(() => {
    if (community) {
      setForm({
        name: community.name || '',
        description: community.description || '',
        address: community.address || '',
        city: community.city || '',
        state: community.state || '',
        country: community.country || '',
        contactPhone: community.contactPhone || '',
      });
    }
  }, [community]);

  const handleSave = async () => {
    await mutate(`${prefix}/settings`, { method: 'PATCH', body: form });
    refetch();
  };

  return (
    <DashboardLayout title="Settings" navItems={communityNav} navTitle="Community">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} />}
      {!loading && !error && (
        <div className="space-y-6 max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2 className="text-lg font-semibold text-gray-900">Community Settings</h2>

          <Card>
            <CardContent>
              <div className="space-y-4">
                <Input label="Community Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  />
                </div>
                <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  <Input label="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                  <Input label="Contact Phone" value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} />
                </div>
                <div className="flex justify-end pt-4">
                  <Button onClick={handleSave} loading={mutating}>Save Settings</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
