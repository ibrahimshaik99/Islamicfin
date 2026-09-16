import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { merchantNav } from '../../lib/navigation';
import { useAuth } from '../../context/AuthContext';
import { useMutation } from '../../lib/useApi';
import { useMerchantProfile } from '../../lib/useMerchantProfile';
import { LoadingState, ErrorState, Button, Input, Card, CardContent } from '../../components/ui';

export default function MerchantSettingsPage() {
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';

  const { merchant, loading, error, refetch } = useMerchantProfile();
  const { mutate, loading: mutating } = useMutation();

  const isSuspended = merchant?.verificationStatus === 'SUSPENDED';

  const [form, setForm] = useState({
    businessName: '',
    description: '',
    phone: '',
    whatsapp: '',
    address: '',
    upiId: '',
  });

  useEffect(() => {
    if (merchant) {
      setForm({
        businessName: merchant.businessName || '',
        description: merchant.description || '',
        phone: merchant.phone || '',
        whatsapp: merchant.whatsapp || '',
        address: merchant.address || '',
        upiId: merchant.upiId || '',
      });
    }
  }, [merchant]);

  const handleSave = async () => {
    const result = await mutate(`${prefix}/merchants/my`, { method: 'PATCH', body: form });
    if (result) refetch();
  };

  const verificationBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      APPROVED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Verified' },
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending Review' },
      REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
      SUSPENDED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Suspended' },
    };
    const style = map[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  return (
    <DashboardLayout title="Settings" navItems={merchantNav} navTitle="Merchant">
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && merchant && (
        <div className="space-y-6 max-w-3xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Merchant Settings</h2>
            <p className="mt-1 text-sm text-gray-500">Manage your store profile and payment details</p>
          </div>

          {isSuspended && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-red-800">Account Suspended</p>
                <p className="text-sm text-red-600 mt-0.5">Your merchant account is currently suspended. You cannot update your profile until it is reactivated.</p>
              </div>
            </div>
          )}

          <Card>
            <CardContent>
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary-50/80 to-transparent rounded-xl mb-6">
                <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-7 h-7 text-primary-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 truncate">{merchant.businessName || 'Untitled Store'}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    {verificationBadge(merchant.verificationStatus)}
                    <span className="text-xs text-gray-400">
                      Member since {new Date(merchant.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <Input
                  label="Business Name"
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  placeholder="Your business name"
                  disabled={isSuspended}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    placeholder="Tell customers about your store..."
                    disabled={isSuspended}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-colors disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Phone"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 XXXXX XXXXX"
                    disabled={isSuspended}
                  />
                  <Input
                    label="WhatsApp"
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    placeholder="+91 XXXXX XXXXX"
                    disabled={isSuspended}
                  />
                </div>

                <Input
                  label="Address"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Store address"
                  disabled={isSuspended}
                />

                <Input
                  label="UPI ID"
                  value={form.upiId}
                  onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                  placeholder="yourname@upi"
                  disabled={isSuspended}
                />

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <Button onClick={handleSave} loading={mutating} disabled={isSuspended}>
                    Save Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}
