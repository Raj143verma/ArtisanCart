interface CheckoutTimerProps {
  timeRemaining: number | null;
}

export function CheckoutTimer({ timeRemaining }: CheckoutTimerProps) {
  if (timeRemaining === null) return null;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isUrgent = timeRemaining <= 180 && timeRemaining > 0;
  const isExpired = timeRemaining <= 0;

  return (
    <div
      className={`checkout-timer-pill ${isUrgent ? 'urgent' : ''} ${isExpired ? 'expired' : ''}`}
      role="timer"
      aria-live="polite"
      aria-label={`Stock reservation time remaining: ${minutes} minutes and ${seconds} seconds`}
    >
      <span className="timer-icon" aria-hidden="true">⏱️</span>
      <span className="timer-text">
        {isExpired ? (
          <strong>Stock Reservation Expired</strong>
        ) : (
          <>
            Items reserved for: <strong>{formattedTime}</strong>
          </>
        )}
      </span>
    </div>
  );
}
