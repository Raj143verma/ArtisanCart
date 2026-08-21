import { Link } from 'react-router-dom';
import { WishlistItemCard } from '../components/commerce/WishlistItemCard';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorDisplay } from '../components/common/ErrorDisplay';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { useWishlist } from '../hooks/useWishlist';

export function WishlistPage() {
  const {
    wishlistItems,
    totalCount,
    isLoading,
    isMutating,
    error,
    removeFromWishlist,
    clearWishlist,
    refreshWishlist,
  } = useWishlist();

  if (isLoading) {
    return <LoadingSkeleton type="card" count={4} />;
  }

  return (
    <div className="wishlist-page-container">
      <div className="catalog-header">
        <div className="catalog-title-row">
          <div>
            <span className="eyebrow">Customer Favorites</span>
            <h1 style={{ margin: '0.25rem 0 0 0', color: '#103b68', fontSize: '2.2rem' }}>
              Your Saved Items ({totalCount})
            </h1>
          </div>
          {wishlistItems.length > 0 && (
            <button
              type="button"
              className="button button--small button--secondary"
              onClick={() => void clearWishlist()}
              disabled={isMutating}
            >
              Clear Wishlist
            </button>
          )}
        </div>
      </div>

      {error && <ErrorDisplay message={error} onRetry={refreshWishlist} />}

      {wishlistItems.length === 0 ? (
        <div style={{ marginTop: '2rem' }}>
          <EmptyState
            title="Your Wishlist is Empty"
            description="Save your favorite handcrafted items while browsing to track price changes, stock availability, or purchase later."
            actionText="Discover Artisan Creations"
            onAction={() => window.location.assign('/products')}
          />
        </div>
      ) : (
        <div className="wishlist-grid" role="region" aria-label="Saved Wishlist Items">
          {wishlistItems.map((item) => (
            <WishlistItemCard
              key={`${String(item.product?._id || item.product)}-${String(
                item.variant?._id || item.variant,
              )}`}
              item={item}
              onRemove={removeFromWishlist}
              isMutating={isMutating}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: '2.5rem' }}>
        <Link to="/products" className="button button--secondary button--small">
          &larr; Explore More Products
        </Link>
      </div>
    </div>
  );
}
