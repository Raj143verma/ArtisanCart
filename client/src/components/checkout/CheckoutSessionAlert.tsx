interface CheckoutSessionAlertProps {
  onRestart: () => void;
}

export function CheckoutSessionAlert({ onRestart }: CheckoutSessionAlertProps) {
  return (
    <div className="checkout-session-alert" role="alert">
      <div className="alert-content">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 14 14" />
        </svg>
        <div>
          <h4>Checkout Session Expired</h4>
          <p>
            Your 15-minute stock hold has expired to allow other buyers to purchase these handcrafted items.
          </p>
        </div>
      </div>
      <button
        type="button"
        className="button button--small button--secondary"
        onClick={onRestart}
      >
        Re-reserve &amp; Restart Checkout
      </button>
    </div>
  );
}
