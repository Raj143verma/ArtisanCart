import { Link } from 'react-router-dom';
import { CartItemRow } from '../components/commerce/CartItemRow';
import { CartSummaryCard } from '../components/commerce/CartSummaryCard';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorDisplay } from '../components/common/ErrorDisplay';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { useCart } from '../hooks/useCart';

export function CartPage() {
  const {
    items,
    itemCount,
    summary,
    isLoading,
    isMutating,
    error,
    updateQuantity,
    removeFromCart,
    clearCart,
    applyCoupon,
    removeCoupon,
    refreshCart,
  } = useCart();

  if (isLoading) {
    return <LoadingSkeleton type="card" count={3} />;
  }

  return (
    <div className="cart-page-container">
      <div className="cart-page-header">
        <div>
          <span className="eyebrow">Customer Commerce</span>
          <h1 style={{ margin: '0.25rem 0 0 0', color: '#103b68', fontSize: '2.2rem' }}>
            Your Shopping Cart
          </h1>
        </div>
      </div>

      {error && <ErrorDisplay message={error} onRetry={refreshCart} />}

      {items.length === 0 ? (
        <div style={{ marginTop: '2rem' }}>
          <EmptyState
            title="Your Cart is Empty"
            description="You haven't added any handcrafted treasures to your shopping cart yet. Discover unique creations from independent artisans."
            actionText="Explore Marketplace"
            onAction={() => window.location.assign('/products')}
          />
        </div>
      ) : (
        <div className="cart-page-layout">
          {/* Items Column */}
          <section className="cart-items-column" aria-label="Shopping cart items">
            <div className="cart-items-header">
              <h2>Cart Items ({itemCount})</h2>
              <button
                type="button"
                className="link-action-btn link-action-btn--danger"
                onClick={() => void clearCart()}
                disabled={isMutating}
              >
                Clear Cart
              </button>
            </div>

            <div className="cart-items-list">
              {items.map((item) => (
                <CartItemRow
                  key={String(item.variant?._id || item.variant)}
                  item={item}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeFromCart}
                  isMutating={isMutating}
                />
              ))}
            </div>

            <div style={{ marginTop: '1rem' }}>
              <Link to="/products" className="button button--secondary button--small">
                &larr; Continue Shopping
              </Link>
            </div>
          </section>

          {/* Order Summary Column */}
          <aside className="cart-summary-column" aria-label="Order summary and checkout">
            <CartSummaryCard
              summary={summary}
              onApplyCoupon={applyCoupon}
              onRemoveCoupon={removeCoupon}
              isMutating={isMutating}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
