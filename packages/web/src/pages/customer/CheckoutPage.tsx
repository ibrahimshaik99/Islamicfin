import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { api } from '../../lib/api';
import { Button, Input, Card, CardContent } from '../../components/ui';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const { items, subtotal, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'DIRECT_UPI'>('COD');
  const [address, setAddress] = useState({ name: '', phone: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '' });
  const [notes, setNotes] = useState('');
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (items.length === 0 && !success) {
      navigate('/app/cart');
    }
  }, [items.length, success, navigate]);

  // Group items by merchant
  const merchantGroups = items.reduce<Record<string, typeof items>>((acc, item) => {
    (acc[item.merchantId] = acc[item.merchantId] || []).push(item);
    return acc;
  }, {});

  const toPaise = (priceStr: string, quantity: number) =>
    Math.round(parseFloat(priceStr) * 100) * quantity;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!address.name.trim()) errors.name = 'Name is required';
    if (!address.addressLine1.trim()) errors.addressLine1 = 'Address is required';
    if (!address.city.trim()) errors.city = 'City is required';
    if (!address.state.trim()) errors.state = 'State is required';
    if (!address.pincode.trim()) errors.pincode = 'Pincode is required';
    if (!address.phone.trim()) errors.phone = 'Phone is required';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCheckout = async () => {
    if (!validate()) return;
    setLoading(true);
    setError(null);
    try {
      const merchantEntries = Object.entries(merchantGroups);
      let lastOrderId: string | null = null;
      for (const [merchantId, merchantItems] of merchantEntries) {
        const res = await api<{ data: { id: string; orderNumber: string } }>(`${prefix}/orders`, {
          method: 'POST',
          body: {
            merchantId,
            items: merchantItems.map((i) => ({ productId: i.productId, quantity: i.quantity })),
            shippingAddress: address,
            paymentMethod,
            notes: notes || undefined,
          },
        });
        lastOrderId = res.data.id;
      }
      setSuccess(true);
      clearCart();
      navigate(`/app/orders/${lastOrderId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (success) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 safe-top">
        <div className="flex items-center h-12 px-4">
          <button onClick={() => navigate(-1)} className="touch-target -ml-2 flex items-center justify-center">
            <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h1 className="text-sm font-semibold text-gray-900 ml-2">Checkout</h1>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-8">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
        )}

        {/* Shipping Address */}
        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Shipping Address</h3>
            <div className="space-y-3">
              <div>
                <Input label="Full Name" value={address.name} onChange={(e) => setAddress({ ...address, name: e.target.value })} placeholder="Your name" />
                {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
              </div>
              <div>
                <Input label="Phone" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} placeholder="10-digit phone" type="tel" />
                {fieldErrors.phone && <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>}
              </div>
              <div>
                <Input label="Address Line 1" value={address.addressLine1} onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })} placeholder="House/Flat no., Street" />
                {fieldErrors.addressLine1 && <p className="text-xs text-red-500 mt-1">{fieldErrors.addressLine1}</p>}
              </div>
              <Input label="Address Line 2" value={address.addressLine2} onChange={(e) => setAddress({ ...address, addressLine2: e.target.value })} placeholder="Landmark (optional)" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Input label="City" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                  {fieldErrors.city && <p className="text-xs text-red-500 mt-1">{fieldErrors.city}</p>}
                </div>
                <div>
                  <Input label="State" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
                  {fieldErrors.state && <p className="text-xs text-red-500 mt-1">{fieldErrors.state}</p>}
                </div>
              </div>
              <div>
                <Input label="Pincode" value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })} placeholder="6-digit pincode" />
                {fieldErrors.pincode && <p className="text-xs text-red-500 mt-1">{fieldErrors.pincode}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment Method</h3>
            <div className="space-y-2">
              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${paymentMethod === 'COD' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                <input type="radio" name="payment" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} className="text-primary-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Cash on Delivery</p>
                  <p className="text-xs text-gray-500">Pay when you receive your order</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${paymentMethod === 'DIRECT_UPI' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                <input type="radio" name="payment" checked={paymentMethod === 'DIRECT_UPI'} onChange={() => setPaymentMethod('DIRECT_UPI')} className="text-primary-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Direct UPI to Merchant</p>
                  <p className="text-xs text-gray-500">Pay directly to the merchant's UPI. Report payment after.</p>
                </div>
              </label>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">No platform wallet or escrow. Payments go directly to merchants.</p>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Summary</h3>
            <div className="space-y-2">
              {items.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-gray-600 truncate">{item.name} × {item.quantity}</span>
                  <span className="font-medium text-gray-900">₹{(toPaise(item.salePrice || item.price, item.quantity) / 100).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm border-t border-gray-100 pt-2">
                <span className="text-gray-900 font-semibold">Total</span>
                <span className="font-bold text-primary-600">₹{subtotal}</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2">Final totals confirmed by backend at order creation.</p>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardContent>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Order Notes</h3>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
              placeholder="Any special instructions? (optional)"
            />
          </CardContent>
        </Card>

        {/* Place Order buttons per merchant */}
        <Button onClick={handleCheckout} loading={loading} className="w-full">
          Place Order · ₹{subtotal}
        </Button>
      </div>
    </div>
  );
}
