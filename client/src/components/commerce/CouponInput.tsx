import { useState, type FormEvent } from 'react';
import type { Coupon } from '../../types/commerce';

interface CouponInputProps {
  appliedCoupon: Coupon | null;
  onApplyCoupon: (code: string) => Promise<{ success: boolean; message: string }>;
  onRemoveCoupon: () => void;
  isMutating?: boolean;
}

export function CouponInput({
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  isMutating = false,
}: CouponInputProps) {
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsSubmitting(true);
    setFeedback(null);

    const result = await onApplyCoupon(code);
    if (result.success) {
      setFeedback({ type: 'success', message: result.message });
      setCode('');
    } else {
      setFeedback({ type: 'error', message: result.message });
    }
    setIsSubmitting(false);
  };

  const handleRemove = () => {
    onRemoveCoupon();
    setFeedback(null);
  };

  if (appliedCoupon) {
    return (
      <div className="applied-coupon-box">
        <div className="applied-coupon-info">
          <span className="coupon-tag-icon" aria-hidden="true">🏷️</span>
          <div>
            <strong>{appliedCoupon.code}</strong>
            <span className="applied-discount-label">
              {appliedCoupon.discountType === 'percentage'
                ? `${appliedCoupon.discountValue}% OFF`
                : `$${appliedCoupon.discountValue} OFF`}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="remove-coupon-btn"
          onClick={handleRemove}
          disabled={isMutating}
          aria-label={`Remove coupon ${appliedCoupon.code}`}
        >
          &times;
        </button>
      </div>
    );
  }

  return (
    <div className="coupon-input-container">
      <form className="coupon-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Promo code (e.g. SUMMER25)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          disabled={isSubmitting || isMutating}
          aria-label="Enter promotional code"
        />
        <button
          type="submit"
          className="button button--small button--secondary"
          disabled={!code.trim() || isSubmitting || isMutating}
        >
          {isSubmitting ? 'Checking...' : 'Apply'}
        </button>
      </form>

      {feedback && (
        <p
          className={`coupon-feedback-msg ${
            feedback.type === 'success' ? 'coupon-feedback--success' : 'coupon-feedback--error'
          }`}
          role="status"
        >
          {feedback.message}
        </p>
      )}
    </div>
  );
}
