import type { CheckoutStep } from '../../hooks/useCheckout';

interface CheckoutStepperProps {
  currentStep: CheckoutStep;
}

const STEPS = [
  { step: 1, title: 'Shipping' },
  { step: 2, title: 'Review & Promo' },
  { step: 3, title: 'Payment' },
  { step: 4, title: 'Confirmation' },
] as const;

export function CheckoutStepper({ currentStep }: CheckoutStepperProps) {
  return (
    <nav className="checkout-stepper" aria-label="Checkout Progress">
      <ol className="stepper-list">
        {STEPS.map(({ step, title }) => {
          const isCompleted = currentStep > step;
          const isCurrent = currentStep === step;

          return (
            <li
              key={step}
              className={`stepper-item ${isCurrent ? 'active' : ''} ${
                isCompleted ? 'completed' : ''
              }`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <div className="stepper-circle">
                {isCompleted ? '✓' : step}
              </div>
              <span className="stepper-label">{title}</span>
              {step < STEPS.length && <div className="stepper-line" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
