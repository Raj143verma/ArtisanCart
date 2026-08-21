import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ProductGallery } from '../components/catalog/ProductGallery';
import { ReviewList } from '../components/catalog/ReviewList';
import { StockBadge } from '../components/catalog/StockBadge';
import { VariantSelector } from '../components/catalog/VariantSelector';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorDisplay } from '../components/common/ErrorDisplay';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useProductDetail } from '../hooks/useProductDetail';
import { useWishlist } from '../hooks/useWishlist';

export function ProductDetailPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    product,
    variants,
    selectedVariant,
    setSelectedVariant,
    reviews,
    reviewsMeta,
    effectivePrice,
    currentInventory,
    isLoading,
    error,
    refetch,
  } = useProductDetail();

  const { addToCart, isMutating: isCartMutating } = useCart();
  const { isWishlisted, toggleWishlist, isMutating: isWishlistMutating } = useWishlist();

  const [quantity, setQuantity] = useState(1);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  if (isLoading) {
    return <LoadingSkeleton type="detail" />;
  }

  if (error) {
    return (
      <div style={{ maxWidth: '800px', margin: '2rem auto' }}>
        <ErrorDisplay message={error} onRetry={refetch} />
        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link to="/products" className="button button--secondary">
            &larr; Back to Catalog
          </Link>
        </p>
      </div>
    );
  }

  if (!product) {
    return (
      <EmptyState
        title="Product Not Available"
        description="The handcrafted item you are looking for might have been retired or is currently unavailable."
        actionText="Explore Marketplace"
        onAction={() => window.location.assign('/products')}
      />
    );
  }

  const categoryName =
    typeof product.category === 'object' && product.category !== null && 'name' in product.category
      ? product.category.name
      : null;

  const store = typeof product.store === 'object' && product.store !== null ? product.store : null;

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: product.currency || 'USD',
  }).format(effectivePrice);

  const availableStock = currentInventory?.quantity;
  const isOutOfStock = availableStock !== undefined && availableStock <= 0;
  const variantId = selectedVariant?._id || product._id;
  const isSaved = isWishlisted(variantId);

  const handleAddToCart = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setActionFeedback(null);
    const success = await addToCart(product._id, variantId, quantity);
    if (success) {
      setActionFeedback(`Added ${quantity} item(s) to your cart!`);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const handleToggleWishlist = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    await toggleWishlist(product._id, variantId);
  };

  return (
    <div className="product-detail-container">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumbs" style={{ marginBottom: '1.5rem', fontSize: '0.88rem', color: '#526176' }}>
        <Link to="/">Home</Link> / <Link to="/products">Products</Link>
        {categoryName && <> / <span>{categoryName}</span></>}
        {' / '}
        <strong style={{ color: '#172033' }}>{product.title}</strong>
      </nav>

      <div className="product-detail-layout">
        {/* Left Gallery Column */}
        <ProductGallery images={product.images} title={product.title} />

        {/* Right Info Column */}
        <div className="product-info-column">
          <div className="product-detail-eyebrow">
            {categoryName && <span className="eyebrow">{categoryName}</span>}
            <StockBadge
              quantity={currentInventory?.quantity}
              lowStockThreshold={currentInventory?.lowStockThreshold}
              allowBackorder={currentInventory?.allowBackorder}
            />
          </div>

          <h1 className="product-detail-title">{product.title}</h1>

          <div className="product-detail-price-row">
            <span className="main-price">{formattedPrice}</span>
            {selectedVariant && (
              <span style={{ fontSize: '0.9rem', color: '#526176' }}>
                SKU: {selectedVariant.sku}
              </span>
            )}
          </div>

          {/* Artisan Store Provenance Card */}
          {store && (
            <div className="artisan-store-card">
              <div className="store-avatar">
                {store.logo ? (
                  <img src={store.logo} alt={store.name} />
                ) : (
                  <span>{store.name.charAt(0)}</span>
                )}
              </div>
              <div className="store-info">
                <h4>{store.name}</h4>
                <span>Verified Independent Artisan</span>
              </div>
            </div>
          )}

          {/* Dynamic Variant Matrix Selector */}
          <VariantSelector
            variants={variants}
            selectedVariant={selectedVariant}
            onSelectVariant={(v) => {
              setSelectedVariant(v);
              setQuantity(1);
            }}
            currency={product.currency}
          />

          {/* Commerce Actions: Quantity + Add to Cart + Wishlist */}
          <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div className="quantity-picker" role="group" aria-label="Quantity to purchase">
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || isOutOfStock}
                  aria-label="Decrease quantity"
                >
                  &minus;
                </button>
                <span className="qty-value">{quantity}</span>
                <button
                  type="button"
                  className="qty-btn"
                  onClick={() =>
                    setQuantity((q) =>
                      availableStock !== undefined ? Math.min(availableStock, q + 1) : q + 1,
                    )
                  }
                  disabled={
                    isOutOfStock || (availableStock !== undefined && quantity >= availableStock)
                  }
                  aria-label="Increase quantity"
                >
                  &#43;
                </button>
              </div>

              <button
                type="button"
                className="button button--checkout"
                style={{ flex: 1 }}
                onClick={handleAddToCart}
                disabled={isOutOfStock || isCartMutating}
              >
                {isOutOfStock ? 'Sold Out' : isCartMutating ? 'Adding...' : 'Add to Cart'}
              </button>

              <button
                type="button"
                className={`icon-action-btn ${isSaved ? 'active' : ''}`}
                style={{ width: '48px', height: '48px', color: isSaved ? '#b42318' : '#526176' }}
                onClick={handleToggleWishlist}
                disabled={isWishlistMutating}
                title={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
                aria-label={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>

            {actionFeedback && (
              <div
                style={{
                  padding: '0.6rem 0.85rem',
                  background: '#eaf6ee',
                  color: '#28734a',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                role="status"
              >
                <span>{actionFeedback}</span>
                <Link to="/customer/cart" style={{ color: '#28734a', textDecoration: 'underline' }}>
                  View Cart &rarr;
                </Link>
              </div>
            )}
          </div>

          {/* Product Description */}
          <div className="product-detail-description">
            <h3>About this Craft</h3>
            <p>{product.description || 'Handmade with care by artisan creator.'}</p>

            {product.tags && product.tags.length > 0 && (
              <div className="product-tags-list">
                {product.tags.map((tag) => (
                  <span key={tag} className="tag-pill">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reviews & Social Proof */}
      <ReviewList reviews={reviews} meta={reviewsMeta} />
    </div>
  );
}
