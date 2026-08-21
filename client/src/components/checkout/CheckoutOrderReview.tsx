import { useState } from 'react';
import type { CheckoutSession } from '../../types/checkout';

interface CheckoutOrderReviewProps {
  session: CheckoutSession;
  onApplyCoupon: (code: string) => Promise<boolean>;
  onRemoveCoupon: () => Promise<boolean>;
  onProceedToPayment: () => void;
  onEditAddress: () => void;
  isSubmitting?: boolean;
}

export function CheckoutOrderReview({
  session,
  onApplyCoupon,
  onRemoveCoupon,
  onProceedToPayment,
  onEditAddress,
  isSubmitting = false,
}: CheckoutOrderReviewProps) {
  const [couponCode, setCouponCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    const success = await onApplyCoupon(couponCode);
    if (success) {
      setCouponCode('');
    }
    setIsApplyingCoupon(false);
  };

  const address = session.shippingAddress;

  return (
    <div className="checkout-review-container">
      {/* 1. Delivery Details Box */}
      <section className="checkout-review-card" aria-label="Delivery Details">
        <div className="card-header-row">
          <h3 className="card-title">Shipping &amp; Delivery</h3>
          <button
            type="button"
            className="link-action-btn"
            onClick={onEditAddress}
            disabled={isSubmitting}
          >
            Edit Address
          </button>
        </div>
        <div className="address-summary-text">
          <strong>{address.fullName}</strong> · {address.phone}
          <br />
          {address.addressLine1} {address.addressLine2 && `, ${address.addressLine2}`}
          <br />
          {address.city}, {address.state} {address.postalCode}, {address.country}
        </div>
      </section>

      {/* 2. Items Review */}
      <section className="checkout-review-card" aria-label="Reserved Order Items">
        <h3 className="card-title">Reserved Items ({session.items.length})</h3>
        <div className="checkout-items-list">
          {session.items.map((item, idx) => {
            const product = typeof item.product === 'object' ? item.product : null;
            const variant = typeof item.variant === 'object' ? item.variant : null;
            const thumbnail = product?.images?.find((img) => img.isThumbnail)?.url || product?.images?.[0]?.url;

            return (
              <div key={idx} className="checkout-item-compact-row">
                <div className="compact-img-wrap">
                  {thumbnail ? (
                    <img src={thumbnail} alt={product?.title || 'Product'} />
                  ) : (
                    <div className="cart-item-placeholder-img">🎨</div>
                  )}
                </div>

                <div className="compact-info">
                  <span className="compact-title">{product?.title || 'Handcrafted Artisan Item'}</span>
                  {variant?.attributes && variant.attributes.length > 0 && (
                    <span className="compact-variant">
                      {variant.attributes.map((a) => `${a.name}: ${a.value}`).join(' · ')}
                    </span>
                  )}
                  <span className="compact-qty">Qty: {item.quantity}</span>
                </div>

                <div className="compact-price">
                  {formatPrice(item.priceSnapshot * item.quantity)}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Promotional Code */}
      <section className="checkout-review-card" aria-label="Apply Promotion Code">
        <h3 className="card-title">Promotional Discount</h3>
        {session.couponCode ? (
          <div className="applied-coupon-box">
            <div className="applied-coupon-info">
              <span className="coupon-tag-icon" aria-hidden="true">🏷️</span>
              <div>
                <strong>{session.couponCode}</strong>
                <span className="applied-discount-label">
                  Discount applied: &minus;{formatPrice(session.pricing.discount)}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="remove-coupon-btn"
              onClick={() => void onRemoveCoupon()}
              disabled={isSubmitting}
              aria-label="Remove coupon"
            >
              &times;
            </button>
          </div>
        ) : (
          <form className="coupon-input-form" onSubmit={handleApplyCoupon}>
            <input
              type="text"
              placeholder="Promo code (e.g. SUMMER25)"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              disabled={isApplyingCoupon || isSubmitting}
              aria-label="Enter promotional code"
            />
            <button
              type="submit"
              className="button button--small button--secondary"
              disabled={!couponCode.trim() || isApplyingCoupon || isSubmitting}
            >
              {isApplyingCoupon ? 'Applying...' : 'Apply'}
            </button>
          </form>
        )}
      </section>

      {/* 4. Authoritative Pricing Breakdown */}
      <section className="checkout-review-card" aria-label="Authoritative Price Breakdown">
        <h3 className="card-title">Payment Summary</h3>
        <div className="summary-rows">
          <div className="summary-row">
            <span>Subtotal</span>
            <span>{formatPrice(session.pricing.subtotal)}</span>
          </div>

          {session.pricing.discount > 0 && (
            <div className="summary-row summary-row--discount">
              <span>Promotion Discount</span>
              <span>&minus;{formatPrice(session.pricing.discount)}</span>
            </div>
          )}

          <div className="summary-row">
            <span>Shipping</span>
            <span>
              {session.pricing.shippingFee === 0 ? (
                <span className="free-shipping-tag">FREE</span>
              ) : (
                formatPrice(session.pricing.shippingFee)
              )}
            </span>
          </div>

          <div className="summary-divider" />

          <div className="summary-row summary-row--total">
            <span>Total to Pay</span>
            <span>{formatPrice(session.pricing.total)}</span>
          </div>
        </div>

        <button
          type="button"
          className="button button--checkout"
          style={{ marginTop: '1.5rem' }}
          onClick={onProceedToPayment}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Placing Order...' : `Proceed to Payment (${formatPrice(session.pricing.total)}) &rarr;`}
        </button>
      </section>
    </div>
  );
}
