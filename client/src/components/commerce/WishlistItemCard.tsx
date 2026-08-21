import { Link } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { StockBadge } from '../catalog/StockBadge';
import type { WishlistItem } from '../../types/commerce';

interface WishlistItemCardProps {
  item: WishlistItem;
  onRemove: (productId: string, variantId: string) => void;
  isMutating?: boolean;
}

export function WishlistItemCard({
  item,
  onRemove,
  isMutating = false,
}: WishlistItemCardProps) {
  const { addToCart } = useCart();

  const productId = String(item.product?._id || item.product);
  const variantId = String(item.variant?._id || item.variant);

  const thumbnail =
    item.product?.images?.find((img) => img.isThumbnail)?.url ||
    item.product?.images?.[0]?.url ||
    null;

  const price = item.variant?.price || item.product?.basePrice || 0;
  const isOutOfStock = item.inventory?.available === 0 || item.inventory?.status === 'out_of_stock';

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  const handleMoveToCart = async () => {
    const success = await addToCart(productId, variantId, 1);
    if (success) {
      onRemove(productId, variantId);
    }
  };

  return (
    <article className="wishlist-item-card" aria-label={`Wishlist item: ${item.product?.title || 'Product'}`}>
      <Link to={`/products/${productId}`} className="wishlist-card-image-link" tabIndex={-1}>
        <div className="wishlist-card-image-wrap">
          {thumbnail ? (
            <img src={thumbnail} alt={item.product?.title || 'Product'} />
          ) : (
            <div className="wishlist-card-placeholder" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )}

          <button
            type="button"
            className="wishlist-remove-btn"
            title="Remove from wishlist"
            onClick={(e) => {
              e.preventDefault();
              onRemove(productId, variantId);
            }}
            disabled={isMutating}
            aria-label="Remove item from wishlist"
          >
            &times;
          </button>
        </div>
      </Link>

      <div className="wishlist-card-content">
        {item.store?.name && (
          <span className="wishlist-store-name">by {item.store.name}</span>
        )}

        <h4 className="wishlist-card-title">
          <Link to={`/products/${productId}`}>
            {item.product?.title || 'Handmade Creation'}
          </Link>
        </h4>

        {item.variant?.attributes && item.variant.attributes.length > 0 && (
          <div className="wishlist-card-attributes">
            {item.variant.attributes.map((attr) => (
              <span key={attr.name} className="attribute-pill">
                {attr.name}: {attr.value}
              </span>
            ))}
          </div>
        )}

        <div className="wishlist-card-price-row">
          <span className="wishlist-price">{formatPrice(price)}</span>
          <StockBadge quantity={item.inventory?.available} />
        </div>

        <div className="wishlist-card-actions">
          <button
            type="button"
            className="button button--small button--full"
            onClick={handleMoveToCart}
            disabled={isMutating || isOutOfStock}
          >
            {isOutOfStock ? 'Out of Stock' : 'Move to Cart'}
          </button>
        </div>
      </div>
    </article>
  );
}
