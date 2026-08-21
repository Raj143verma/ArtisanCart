import { useNavigate } from 'react-router-dom';
import type { CartSummary } from '../../types/commerce';
import { CouponInput } from './CouponInput';

interface CartSummaryCardProps {
  summary: CartSummary;
  onApplyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  onRemoveCoupon: () => void;
  isMutating?: boolean;
  disabled?: boolean;
}

export function CartSummaryCard({
  summary,
  onApplyCoupon,
  onRemoveCoupon,
  isMutating = false,
  disabled = false,
}: CartSummaryCardProps) {
  const navigate = useNavigate();

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);

  const isFreeShipping = summary.subtotal >= 50 || summary.subtotal === 0;

  const handleCheckout = () => {
    navigate('/customer/checkout');
  };

  return (
    <div className="cart-summary-card">
      <h3 className="cart-summary-title">Order Summary</h3>

      <div className="summary-rows">
        <div className="summary-row">
          <span>Subtotal ({summary.itemCount} {summary.itemCount === 1 ? 'item' : 'items'})</span>
          <span>{formatPrice(summary.subtotal)}</span>
        </div>

        {summary.discount > 0 && (
          <div className="summary-row summary-row--discount">
            <span>Promotion Discount</span>
            <span>&minus;{formatPrice(summary.discount)}</span>
          </div>
        )}

        <div className="summary-row">
          <span>Estimated Shipping</span>
          <span>
            {isFreeShipping ? (
              <span className="free-shipping-tag">FREE</span>
            ) : (
              formatPrice(summary.estimatedShipping)
            )}
          </span>
        </div>

        {!isFreeShipping && (
          <p className="free-shipping-teaser">
            Add {formatPrice(50 - summary.subtotal)} more to qualify for <strong>FREE shipping</strong>!
          </p>
        )}

        <div className="summary-divider" />

        <div className="summary-row summary-row--total">
          <span>Estimated Total</span>
          <span>{formatPrice(summary.total)}</span>
        </div>
      </div>

      <div className="summary-coupon-section">
        <label className="coupon-label">Promotional Code</label>
        <CouponInput
          appliedCoupon={summary.appliedCoupon || null}
          onApplyCoupon={onApplyCoupon}
          onRemoveCoupon={onRemoveCoupon}
          isMutating={isMutating}
        />
      </div>

      <button
        type="button"
        className="button button--checkout"
        onClick={handleCheckout}
        disabled={disabled || summary.itemCount === 0 || isMutating}
      >
        Proceed to Checkout &rarr;
      </button>

      <div className="cart-trust-badges">
        <div className="trust-badge-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>100% Buyer Protection &amp; Handcrafted Authenticity</span>
        </div>
        <div className="trust-badge-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
          </svg>
          <span>Encrypted, Secure Checkout</span>
        </div>
      </div>
    </div>
  );
}
