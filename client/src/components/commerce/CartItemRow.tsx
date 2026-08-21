import { Link } from 'react-router-dom';
import { useWishlist } from '../../hooks/useWishlist';
import type { CartItem } from '../../types/commerce';

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
  isMutating?: boolean;
}

export function CartItemRow({
  item,
  onUpdateQuantity,
  onRemove,
  isMutating = false,
}: CartItemRowProps) {
  const { addToWishlist } = useWishlist();

  const variantId = String(item.variant?._id || item.variant);
  const productId = String(item.product?._id || item.product);

  const thumbnail =
    item.product?.images?.find((img) => img.isThumbnail)?.url ||
    item.product?.images?.[0]?.url ||
    null;

  const unitPrice = item.priceSnapshot || item.variant?.price || 0;
  const lineTotal = unitPrice * item.quantity;
  const maxStock = item.variant?.stockQuantity;

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  const handleMoveToWishlist = async () => {
    await addToWishlist(productId, variantId);
    onRemove(variantId);
  };

  return (
    <article className="cart-item-row" aria-label={`Cart item: ${item.product?.title || 'Product'}`}>
      <Link
        to={`/products/${productId}`}
        className="cart-item-image-link"
        tabIndex={-1}
      >
        <div className="cart-item-image-wrap">
          {thumbnail ? (
            <img src={thumbnail} alt={item.product?.title || 'Product'} />
          ) : (
            <div className="cart-item-placeholder-img" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )}
        </div>
      </Link>

      <div className="cart-item-info">
        <h4 className="cart-item-title">
          <Link to={`/products/${productId}`}>
            {item.product?.title || 'Handcrafted Artisan Item'}
          </Link>
        </h4>

        {item.variant?.attributes && item.variant.attributes.length > 0 && (
          <div className="cart-item-attributes">
            {item.variant.attributes.map((attr) => (
              <span key={attr.name} className="attribute-pill">
                <strong>{attr.name}:</strong> {attr.value}
              </span>
            ))}
          </div>
        )}

        {item.variant?.sku && (
          <span className="cart-item-sku">SKU: {item.variant.sku}</span>
        )}

        <div className="cart-item-unit-price">
          {formatPrice(unitPrice)} each
        </div>

        <div className="cart-item-actions-mobile">
          <button
            type="button"
            className="link-action-btn"
            onClick={handleMoveToWishlist}
            disabled={isMutating}
          >
            Move to Wishlist
          </button>
          <span className="divider-dot">·</span>
          <button
            type="button"
            className="link-action-btn link-action-btn--danger"
            onClick={() => onRemove(variantId)}
            disabled={isMutating}
          >
            Remove
          </button>
        </div>
      </div>

      <div className="cart-item-quantity-controls">
        <div className="quantity-picker" role="group" aria-label="Adjust item quantity">
          <button
            type="button"
            className="qty-btn"
            onClick={() => onUpdateQuantity(variantId, item.quantity - 1)}
            disabled={isMutating || item.quantity <= 1}
            aria-label="Decrease quantity"
          >
            &minus;
          </button>
          <span className="qty-value" aria-live="polite">
            {item.quantity}
          </span>
          <button
            type="button"
            className="qty-btn"
            onClick={() => onUpdateQuantity(variantId, item.quantity + 1)}
            disabled={isMutating || (maxStock !== undefined && item.quantity >= maxStock)}
            aria-label="Increase quantity"
          >
            &#43;
          </button>
        </div>

        {maxStock !== undefined && item.quantity >= maxStock && (
          <span className="stock-limit-warning">Max stock reached</span>
        )}
      </div>

      <div className="cart-item-total">
        <span className="total-amount">{formatPrice(lineTotal)}</span>
      </div>

      <div className="cart-item-actions-desktop">
        <button
          type="button"
          className="icon-action-btn"
          title="Save for later in Wishlist"
          onClick={handleMoveToWishlist}
          disabled={isMutating}
          aria-label="Move item to wishlist"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        <button
          type="button"
          className="icon-action-btn icon-action-btn--delete"
          title="Remove from cart"
          onClick={() => onRemove(variantId)}
          disabled={isMutating}
          aria-label="Remove item from cart"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </article>
  );
}
