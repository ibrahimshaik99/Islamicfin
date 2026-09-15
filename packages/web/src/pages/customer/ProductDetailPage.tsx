import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../lib/useApi';
import { useCart } from '../../context/CartContext';
import { LoadingState, ErrorState } from '../../components/ui';
import type { Product } from '../../lib/types';

export default function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const { data, loading, error } = useApi<Product>(
    communityId && productId ? `${prefix}/products/${productId}` : null,
  );

  const product = data;

  const handleAdd = () => {
    if (!product) return;
    addItem({
      productId: product.id,
      merchantId: product.merchantId,
      name: product.name,
      price: product.price,
      salePrice: product.salePrice,
      image: product.images?.[0]?.url,
      stockQuantity: product.stockQuantity,
      quantity,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Sticky top bar */}
      <div className="shrink-0 sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b border-gray-100">
        <div className="flex items-center h-12 px-4">
          <button onClick={() => navigate(-1)} className="touch-target -ml-2 flex items-center justify-center">
            <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <span className="text-sm font-medium text-gray-900 ml-2">Product</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {loading && <div className="p-8"><LoadingState /></div>}
        {error && <div className="p-4"><ErrorState message={error} /></div>}

        {product && (
          <div className="animate-in fade-in">
            {/* Image */}
            <div className="aspect-square w-full bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
              {product.images?.[0]?.url ? (
                <img src={product.images[0].url} alt={product.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-7xl">📦</span>
              )}
            </div>

            {/* Product Info */}
            <div className="px-4 pt-5 pb-28 space-y-4">
              <div className="animate-in fade-in slide-in-from-bottom-2 delay-100">
                <h1 className="text-xl font-bold text-gray-900 leading-tight break-words">{product.name}</h1>
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  <span className="text-2xl font-bold text-primary-600">₹{product.salePrice || product.price}</span>
                  {product.salePrice && (
                    <>
                      <span className="text-base text-gray-400 line-through">₹{product.price}</span>
                      <span className="text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                        Save ₹{(parseFloat(product.price) - parseFloat(product.salePrice)).toFixed(0)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Availability */}
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 delay-150">
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${product.stockQuantity > 0 ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className={`text-sm font-medium ${product.stockQuantity > 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {product.stockQuantity > 0 ? `In Stock (${product.stockQuantity} available)` : 'Out of Stock'}
                </span>
              </div>

              {/* Description */}
              {product.description && (
                <div className="animate-in fade-in slide-in-from-bottom-2 delay-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap break-words">{product.description}</p>
                </div>
              )}

              {/* SKU */}
              {product.sku && (
                <p className="text-xs text-gray-400 animate-in fade-in delay-250">SKU: {product.sku}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Fixed bottom action bar */}
      {product && product.stockQuantity > 0 && (
        <div className="shrink-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 p-4 z-30">
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            {/* Quantity selector */}
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden shrink-0">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-11 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 touch-target transition-colors"
              >
                −
              </button>
              <span className="w-10 text-center text-sm font-bold">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
                className="w-11 h-11 flex items-center justify-center text-gray-600 hover:bg-gray-50 touch-target transition-colors"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAdd}
              className={`flex-1 h-12 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                added
                  ? 'bg-green-500 text-white'
                  : 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-200 hover:shadow-xl'
              }`}
            >
              {added ? '✓ Added to Cart' : `Add to Cart · ₹${((parseFloat(product.salePrice || product.price)) * quantity).toFixed(2)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
