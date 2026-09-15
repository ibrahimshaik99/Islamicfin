import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../lib/useApi';
import { useCart } from '../../context/CartContext';
import { LoadingState, ErrorState } from '../../components/ui';
import type { Product, ProductCategory } from '../../lib/types';

export default function MarketplacePage() {
  const navigate = useNavigate();
  const { communityId } = useAuth();
  const prefix = communityId ? `/communities/${communityId}` : '';
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const { addItem } = useCart();
  const [addedId, setAddedId] = useState<string | null>(null);

  const { data: categories } = useApi<ProductCategory[]>(
    communityId ? `${prefix}/categories` : null,
  );

  const productPath = selectedCategory
    ? `${prefix}/products?categoryId=${selectedCategory}`
    : `${prefix}/products`;

  const { data: productsData, loading, error } = useApi<Product[]>(
    communityId ? productPath : null,
  );

  const products = (productsData || []).filter((p) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddToCart = (product: Product) => {
    addItem({
      productId: product.id,
      merchantId: product.merchantId,
      name: product.name,
      price: product.price,
      salePrice: product.salePrice,
      image: product.images?.[0]?.url,
      stockQuantity: product.stockQuantity,
    });
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-orange-50/20">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 text-white sticky top-0 z-30 safe-top animate-in fade-in">
        <div className="px-4 pt-4 pb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate(-1)} className="touch-target -ml-2 flex items-center justify-center">
                <svg className="h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <h1 className="text-lg font-bold">Marketplace</h1>
            </div>
            <Link to="/app/cart" className="relative touch-target flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </Link>
          </div>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-3 text-sm rounded-2xl bg-white/15 backdrop-blur-sm text-white placeholder-white/50 outline-none focus:bg-white/25 border border-white/20 transition-all"
            />
          </div>
        </div>

        {/* Categories */}
        {(categories || []).length > 0 && (
          <div className="px-4 pb-4 flex gap-2 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setSelectedCategory('')}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                !selectedCategory ? 'bg-white text-orange-600 shadow-sm' : 'bg-white/15 text-white/80 hover:bg-white/25'
              }`}
            >
              All
            </button>
            {(categories || []).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                  selectedCategory === cat.id ? 'bg-white text-orange-600 shadow-sm' : 'bg-white/15 text-white/80 hover:bg-white/25'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Products Grid */}
      <div className="p-4">
        {loading && <LoadingState />}
        {error && <ErrorState message={error} />}
        {!loading && !error && products.length === 0 && (
          <div className="text-center py-16 animate-in fade-in">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">📦</span>
            </div>
            <p className="text-sm font-medium text-gray-600">No products found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search or category</p>
          </div>
        )}
        {!loading && !error && (
          <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-4">
            {products.map((product, i) => (
              <div key={product.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all group" style={{ animationDelay: `${i * 30}ms` }}>
                <Link to={`/app/products/${product.id}`}>
                  <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center overflow-hidden">
                    {product.images?.[0]?.url ? (
                      <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <span className="text-4xl group-hover:scale-110 transition-transform">📦</span>
                    )}
                  </div>
                </Link>
                <div className="p-3">
                  <Link to={`/app/products/${product.id}`}>
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight">{product.name}</h3>
                  </Link>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-base font-bold text-primary-600">₹{product.salePrice || product.price}</span>
                    {product.salePrice && (
                      <span className="text-xs text-gray-400 line-through">₹{product.price}</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${product.stockQuantity > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                      {product.stockQuantity > 0 ? 'In Stock' : 'Out of Stock'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => { e.preventDefault(); navigate('/app/messages'); }}
                        className="text-xs font-semibold w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                      >
                        💬
                      </button>
                      {product.stockQuantity > 0 && (
                        <button
                          onClick={() => handleAddToCart(product)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-xl touch-target transition-all ${
                            addedId === product.id
                              ? 'bg-green-500 text-white scale-95'
                              : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-95'
                          }`}
                        >
                          {addedId === product.id ? '✓ Added' : 'Add'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
