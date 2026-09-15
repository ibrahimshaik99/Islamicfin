import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { Button } from '../../components/ui';

export default function CartPage() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, subtotal, totalItems } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <span className="text-5xl">🛒</span>
          <h2 className="text-lg font-semibold text-gray-900 mt-4">Your cart is empty</h2>
          <p className="text-sm text-gray-500 mt-1">Browse the marketplace to find something you like.</p>
          <Button onClick={() => navigate('/app/marketplace')} className="mt-4">
            Browse Marketplace
          </Button>
        </div>
      </div>
    );
  }

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
          <h1 className="text-sm font-semibold text-gray-900 ml-2">Cart ({totalItems})</h1>
        </div>
      </div>

      {/* Cart Items */}
      <div className="p-4 space-y-3 pb-32">
        {items.map((item) => (
          <div key={item.productId} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex gap-3">
              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl">📦</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">{item.name}</h3>
                <p className="text-sm font-bold text-primary-600 mt-1">
                  ₹{item.salePrice || item.price}
                  {item.quantity > 1 && (
                    <span className="text-xs font-normal text-gray-500 ml-1">× {item.quantity}</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
              <div className="flex items-center border border-gray-200 rounded-lg">
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                  className="w-8 h-8 flex items-center justify-center text-gray-600 touch-target text-sm"
                >
                  −
                </button>
                <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                  disabled={item.quantity >= item.stockQuantity}
                  className="w-8 h-8 flex items-center justify-center text-gray-600 touch-target text-sm disabled:opacity-30"
                >
                  +
                </button>
              </div>
              <button
                onClick={() => removeItem(item.productId)}
                className="text-xs text-red-500 font-medium touch-target"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom summary */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-bottom z-30">
        <div className="max-w-lg mx-auto space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal ({totalItems} items)</span>
            <span className="font-bold text-gray-900">₹{subtotal}</span>
          </div>
          <p className="text-[10px] text-gray-400">Delivery fees calculated at checkout. Backend is authoritative for totals.</p>
          <Button onClick={() => navigate('/app/checkout')} className="w-full">
            Proceed to Checkout
          </Button>
        </div>
      </div>
    </div>
  );
}
