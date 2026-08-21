import { useEffect, useState } from 'react';
import { useCart } from './useCart';
import { listActiveCoupons } from '../services/couponService';
import type { Coupon } from '../types/commerce';
import { getApiErrorMessage } from '../services/apiError';

export function useCoupon() {
  const { appliedCoupon, applyCoupon, removeCoupon, discountAmount } = useCart();
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    listActiveCoupons()
      .then((data) => {
        if (isMounted) {
          setAvailableCoupons(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(getApiErrorMessage(err, 'Failed to fetch promotions.'));
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    availableCoupons,
    appliedCoupon,
    discountAmount,
    applyCoupon,
    removeCoupon,
    isLoading,
    error,
  };
}
