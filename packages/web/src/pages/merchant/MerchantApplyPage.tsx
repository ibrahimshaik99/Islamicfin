import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import { Button, Input, Card, CardContent } from '../../components/ui';

export default function MerchantApplyPage() {
  const { communityId, loadSession } = useAuth();
  const navigate = useNavigate();
  const [businessName, setBusinessName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [upiId, setUpiId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!businessName.trim()) { setError('Business name is required.'); return; }
    if (!phone.trim() || !/^\d{10}$/.test(phone.replace(/\D/g, ''))) { setError('Valid 10-digit phone number is required.'); return; }

    if (!communityId) {
      setError('No community selected. Please join a community first.');
      return;
    }

    setLoading(true);
    try {
      await api(`/communities/${communityId}/merchants/apply`, {
        method: 'POST',
        body: {
          businessName: businessName.trim(),
          description: description.trim() || undefined,
          phone: phone.trim(),
          whatsapp: whatsapp.trim() || undefined,
          address: address.trim() || undefined,
          upiId: upiId.trim() || undefined,
        },
      });
      navigate('/merchant', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit application.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // No community - show helpful message
  if (!communityId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full space-y-6">
          <div>
            <Link to="/" className="flex justify-center">
              <div className="h-12 w-12 rounded-xl bg-primary-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">ICP</span>
              </div>
            </Link>
            <h1 className="mt-4 text-center text-2xl font-bold text-gray-900">Become a Merchant</h1>
          </div>
          <Card>
            <CardContent>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Join a Community First</h2>
                <p className="text-sm text-gray-600">
                  You need to be a member of a community before you can apply as a merchant.
                </p>
                <div className="flex flex-col gap-3 pt-2">
                  <Link to="/onboarding">
                    <Button className="w-full" size="lg">Go to Onboarding</Button>
                  </Link>
                  <button
                    onClick={async () => { await loadSession(); window.location.reload(); }}
                    className="text-sm text-primary-600 hover:text-primary-500 font-medium"
                  >
                    Already joined? Click to refresh
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-lg w-full space-y-6">
        <div>
          <Link to="/" className="flex justify-center">
            <div className="h-12 w-12 rounded-xl bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-lg">ICP</span>
            </div>
          </Link>
          <h1 className="mt-4 text-center text-2xl font-bold text-gray-900">Become a Merchant</h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Apply to sell products in your community marketplace
          </p>
        </div>

        <Card>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <svg className="h-5 w-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}

              <Input
                label="Business Name"
                required
                placeholder="e.g. Ahmed's Halal Store"
                value={businessName}
                onChange={(e) => { setBusinessName(e.target.value); setError(''); }}
                autoFocus
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Description</label>
                <textarea
                  rows={3}
                  placeholder="Tell customers about your business..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none"
                />
              </div>

              <Input
                label="Phone Number"
                type="tel"
                required
                placeholder="9876543210"
                value={phone}
                onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, 10)); setError(''); }}
              />

              <Input
                label="WhatsApp Number (optional)"
                type="tel"
                placeholder="9876543210"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, '').slice(0, 10))}
              />

              <Input
                label="Business Address (optional)"
                placeholder="Shop address, city, state"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />

              <Input
                label="UPI ID (optional)"
                placeholder="yourname@upi"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
              />

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
                Your application will be reviewed by your community admin. You will be able to create products once approved.
              </div>

              <Button type="submit" loading={loading} className="w-full" size="lg">
                Submit Application
              </Button>

              <p className="text-center text-sm text-gray-600">
                <Link to="/merchant" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
                  Back to Merchant Dashboard
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
