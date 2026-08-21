import { useCallback, useEffect, useState } from 'react';
import {
  applyCouponToCheckout,
  cancelCheckout,
  initCheckout,
  removeCouponFromCheckout,
} from '../services/checkoutService';
import { createOrder } from '../services/orderService';
import type { Address, CheckoutSession, Order } from '../types/checkout';
import { getApiErrorMessage } from '../services/apiError';

export type CheckoutStep = 1 | 2 | 3 | 4;

export function useCheckout() {
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [activeStep, setActiveStep] = useState<CheckoutStep>(1);
  const [shippingAddress, setShippingAddress] = useState<Address | null>(null);
  const [billingAddress, setBillingAddress] = useState<Address | null>(null);
  const [createdOrders, setCreatedOrders] = useState<Order[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Sync 15-minute countdown timer with server expiresAt
  useEffect(() => {
    if (!session?.expiresAt || session.status !== 'active') {
      setTimeRemaining(null);
      return;
    }

    const calculateRemaining = () => {
      const diffMs = new Date(session.expiresAt).getTime() - Date.now();
      return Math.max(0, Math.floor(diffMs / 1000));
    };

    setTimeRemaining(calculateRemaining());

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session?.expiresAt, session?.status]);

  const isExpired = timeRemaining !== null && timeRemaining <= 0;

  const startCheckout = useCallback(
    async (shipping: Address, billing?: Address | null): Promise<boolean> => {
      setIsSubmitting(true);
      setError(null);
      try {
        const newSession = await initCheckout(shipping, billing);
        setSession(newSession);
        setShippingAddress(shipping);
        setBillingAddress(billing || null);
        setActiveStep(2);
        return true;
      } catch (err) {
        setError(getApiErrorMessage(err, 'Failed to initialize checkout.'));
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const applyCoupon = useCallback(
    async (code: string): Promise<boolean> => {
      if (!session) return false;
      setIsSubmitting(true);
      setError(null);
      try {
        const updated = await applyCouponToCheckout(session._id, code);
        setSession(updated);
        return true;
      } catch (err) {
        setError(getApiErrorMessage(err, 'Invalid coupon code.'));
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [session],
  );

  const removeCoupon = useCallback(async (): Promise<boolean> => {
    if (!session) return false;
    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await removeCouponFromCheckout(session._id);
      setSession(updated);
      return true;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to remove coupon.'));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [session]);

  const placeOrders = useCallback(async (): Promise<Order[] | null> => {
    if (!session) return null;
    setIsSubmitting(true);
    setError(null);
    try {
      const orders = await createOrder(session._id);
      setCreatedOrders(orders);
      setActiveStep(3); // Ready for payment processing
      return orders;
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to place order.'));
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, [session]);

  const cancelActiveSession = useCallback(async () => {
    if (!session) return;
    try {
      await cancelCheckout(session._id);
    } catch {
      // Best-effort cleanup
    } finally {
      setSession(null);
      setActiveStep(1);
    }
  }, [session]);

  const restartCheckout = useCallback(() => {
    setSession(null);
    setActiveStep(1);
    setError(null);
  }, []);

  return {
    session,
    activeStep,
    shippingAddress,
    billingAddress,
    createdOrders,
    isSubmitting,
    error,
    timeRemaining,
    isExpired,
    setActiveStep,
    startCheckout,
    applyCoupon,
    removeCoupon,
    placeOrders,
    cancelActiveSession,
    restartCheckout,
  };
}
