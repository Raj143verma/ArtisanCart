import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AddressForm } from '../components/checkout/AddressForm';
import { CheckoutOrderReview } from '../components/checkout/CheckoutOrderReview';
import { CheckoutSessionAlert } from '../components/checkout/CheckoutSessionAlert';
import { CheckoutStepper } from '../components/checkout/CheckoutStepper';
import { CheckoutTimer } from '../components/checkout/CheckoutTimer';
import { PaymentMethodSelector } from '../components/checkout/PaymentMethodSelector';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorDisplay } from '../components/common/ErrorDisplay';
import { useCart } from '../hooks/useCart';
import { useCheckout } from '../hooks/useCheckout';
import { usePayment } from '../hooks/usePayment';
import type { Address } from '../types/checkout';

export function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, refreshCart } = useCart();
  const {
    session,
    activeStep,
    createdOrders,
    isSubmitting: isCheckoutSubmitting,
    error: checkoutError,
    timeRemaining,
    isExpired,
    setActiveStep,
    startCheckout,
    applyCoupon,
    removeCoupon,
    placeOrders,
    restartCheckout,
  } = useCheckout();

  const {
    isProcessing: isPaymentProcessing,
    paymentError,
    processPayment,
  } = usePayment();

  // If cart is empty and no checkout session is initialized, redirect to cart or show empty state
  const isCartEmpty = !cart || cart.items.length === 0;

  useEffect(() => {
    if (isExpired) {
      void refreshCart();
    }
  }, [isExpired, refreshCart]);

  const handleAddressSubmit = async (shipping: Address, billing?: Address | null) => {
    const success = await startCheckout(shipping, billing);
    return success;
  };

  const handleProceedToPayment = async () => {
    const orders = await placeOrders();
    if (orders && orders.length > 0) {
      void refreshCart();
    }
  };

  const handlePay = async (simulateFailure = false) => {
    if (!session || createdOrders.length === 0) return;
    const orderIds = createdOrders.map((o) => o._id);
    const result = await processPayment(orderIds, simulateFailure);
    if (result.success) {
      navigate('/customer/orders/confirmation', {
        state: {
          session,
          orders: createdOrders,
          transaction: result.transaction,
        },
      });
    }
  };

  if (isCartEmpty && !session) {
    return (
      <div className="checkout-page-container">
        <EmptyState
          title="Your Cart is Empty"
          description="You need at least one handcrafted artisan item in your cart to proceed with checkout."
          actionText="Explore Marketplace"
          onAction={() => navigate('/products')}
        />
      </div>
    );
  }

  return (
    <div className="checkout-page-container">
      <header className="checkout-header">
        <div>
          <span className="eyebrow">Secure Checkout</span>
          <h1 className="checkout-title">Complete Your Order</h1>
        </div>

        {session && session.status === 'active' && (
          <CheckoutTimer timeRemaining={timeRemaining} />
        )}
      </header>

      {/* 4-Step Stepper */}
      <CheckoutStepper currentStep={activeStep} />

      {/* Expired Session Alert */}
      {isExpired && (
        <CheckoutSessionAlert onRestart={restartCheckout} />
      )}

      {/* Global Checkout Error Display */}
      {checkoutError && (
        <div style={{ marginBottom: '1.5rem' }}>
          <ErrorDisplay message={checkoutError} />
        </div>
      )}

      {/* Step 1: Address Capture */}
      {activeStep === 1 && (
        <AddressForm
          onSubmit={handleAddressSubmit}
          isSubmitting={isCheckoutSubmitting}
        />
      )}

      {/* Step 2: Order Review & Coupon Application */}
      {activeStep === 2 && session && (
        <CheckoutOrderReview
          session={session}
          onApplyCoupon={applyCoupon}
          onRemoveCoupon={removeCoupon}
          onProceedToPayment={handleProceedToPayment}
          onEditAddress={() => setActiveStep(1)}
          isSubmitting={isCheckoutSubmitting}
        />
      )}

      {/* Step 3: Payment Method & Simulation */}
      {activeStep === 3 && session && (
        <PaymentMethodSelector
          totalAmount={session.pricing.total}
          onPay={handlePay}
          isProcessing={isPaymentProcessing}
          error={paymentError}
        />
      )}

      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <Link to="/customer/cart" style={{ color: '#526176', fontSize: '0.9rem' }}>
          &larr; Return to Shopping Cart
        </Link>
      </div>
    </div>
  );
}
