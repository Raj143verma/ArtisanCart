import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useWishlist } from '../../hooks/useWishlist';
import type { Product } from '../../types/catalog';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { user } = useAuth();
  const { isWishlisted, toggleWishlist, isMutating } = useWishlist();

  // Determine thumbnail image
  const thumbnail =
    product.images?.find((img) => img.isThumbnail)?.url ||
    product.images?.[0]?.url ||
    null;

  // Format category label
  const categoryName =
    typeof product.category === 'object' && product.category !== null && 'name' in product.category
      ? product.category.name
      : null;

  // Format store label
  const storeName =
    typeof product.store === 'object' && product.store !== null && 'name' in product.store
      ? product.store.name
      : null;

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: product.currency || 'USD',
  }).format(product.basePrice);

  const isSaved = isWishlisted(product._id);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      window.location.assign('/login');
      return;
    }
    toggleWishlist(product._id, product._id);
  };

  return (
    <article className="product-card">
      <div className="product-card-image-wrap">
        <Link to={`/products/${product._id}`} className="product-card-image-link" tabIndex={-1}>
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={product.title}
              className="product-card-img"
              loading="lazy"
            />
          ) : (
            <div className="product-card-placeholder-img" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>Artisan Handcrafted</span>
            </div>
          )}
        </Link>

        {product.isFeatured && (
          <span className="product-card-badge product-card-badge--featured">Featured</span>
        )}

        <button
          type="button"
          className={`product-card-wishlist-btn ${isSaved ? 'active' : ''}`}
          onClick={handleWishlistClick}
          disabled={isMutating}
          title={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
          aria-label={isSaved ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      <div className="product-card-content">
        <div className="product-card-meta">
          {categoryName && <span className="product-card-category">{categoryName}</span>}
          {storeName && <span className="product-card-store">by {storeName}</span>}
        </div>

        <h3 className="product-card-title">
          <Link to={`/products/${product._id}`}>{product.title}</Link>
        </h3>

        {product.description && (
          <p className="product-card-snippet">
            {product.description.length > 90
              ? `${product.description.slice(0, 90)}…`
              : product.description}
          </p>
        )}

        <div className="product-card-footer">
          <span className="product-card-price">{formattedPrice}</span>
          <Link to={`/products/${product._id}`} className="button button--small">
            View Details
          </Link>
        </div>
      </div>
    </article>
  );
}
