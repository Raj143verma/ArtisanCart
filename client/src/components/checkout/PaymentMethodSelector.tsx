import { useState } from 'react';

interface PaymentMethodSelectorProps {
  totalAmount: number;
  currency?: string;
  onPay: (simulateFailure?: boolean) => Promise<void>;
  isProcessing?: boolean;
  error?: string | null;
}

export function PaymentMethodSelector({
  totalAmount,
  currency = 'USD',
  onPay,
  isProcessing = false,
  error,
}: PaymentMethodSelectorProps) {
  const [selectedMethod] = useState<'card' | 'instant'>('card');
  const [cardName, setCardName] = useState('Jane Doe');
  const [cardNumber, setCardNumber] = useState('•••• •••• •••• 4242');
  const [expDate, setExpDate] = useState('12/28');
  const [cvc, setCvc] = useState('123');

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);

  return (
    <div className="payment-method-container">
      <div className="checkout-review-card">
        <h3 className="card-title">Select Payment Method</h3>

        <div className="payment-options-list">
          <label className={`payment-option-label ${selectedMethod === 'card' ? 'active' : ''}`}>
            <input
              type="radio"
              name="paymentMethod"
              checked={selectedMethod === 'card'}
              readOnly
            />
            <div className="payment-option-content">
              <div className="payment-option-header">
                <strong>Credit or Debit Card</strong>
                <span className="card-icons">💳 🔒</span>
              </div>
              <span className="payment-option-sub">
                Secure 256-bit encrypted simulated gateway transaction.
              </span>
            </div>
          </label>
        </div>

        {/* Mock Card Form */}
        <div className="mock-card-fields">
          <label>
            Cardholder Name
            <input
              type="text"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              disabled={isProcessing}
              required
            />
          </label>

          <label>
            Card Number
            <input
              type="text"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              disabled={isProcessing}
              required
            />
          </label>

          <div className="form-grid">
            <label>
              Expiration Date
              <input
                type="text"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
                disabled={isProcessing}
                placeholder="MM/YY"
                required
              />
            </label>
            <label>
              CVC Security Code
              <input
                type="password"
                maxLength={4}
                value={cvc}
                onChange={(e) => setCvc(e.target.value)}
                disabled={isProcessing}
                placeholder="CVC"
                required
              />
            </label>
          </div>
        </div>

        {error && (
          <div className="payment-error-alert" role="alert">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="payment-actions">
          <button
            type="button"
            className="button button--checkout"
            onClick={() => void onPay(false)}
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing Secure Payment...' : `Authorize & Pay ${formatPrice(totalAmount)}`}
          </button>

          <button
            type="button"
            className="button button--small button--secondary"
            style={{ marginTop: '0.75rem', width: '100%', opacity: 0.8 }}
            onClick={() => void onPay(true)}
            disabled={isProcessing}
            title="Test payment decline handling"
          >
            Test Payment Failure Simulation
          </button>
        </div>

        <div className="cart-trust-badges" style={{ marginTop: '1.5rem' }}>
          <div className="trust-badge-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Artisan Direct Payment Guarantee · Encrypted Mock Gateway</span>
          </div>
        </div>
      </div>
    </div>
  );
}
