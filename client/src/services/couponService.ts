import api from './api';
import type { ApiResponse } from '../types/auth';
import type { CartItem, Coupon } from '../types/commerce';

export async function listActiveCoupons(page = 1, limit = 20): Promise<Coupon[]> {
  const response = await api.get<ApiResponse<Coupon[]>>('/coupons', {
    params: { isActive: true, page, limit },
  });
  return response.data.data || [];
}

export function validateCouponLocally(
  coupon: Coupon,
  items: CartItem[],
): {
  isValid: boolean;
  reason?: string;
  eligibleSubtotal: number;
  discountAmount: number;
} {
  const now = new Date();
  if (!coupon.isActive) {
    return { isValid: false, reason: 'This coupon is inactive.', eligibleSubtotal: 0, discountAmount: 0 };
  }

  if (coupon.startDate && new Date(coupon.startDate) > now) {
    return { isValid: false, reason: 'This coupon is not active yet.', eligibleSubtotal: 0, discountAmount: 0 };
  }

  if (coupon.endDate && new Date(coupon.endDate) < now) {
    return { isValid: false, reason: 'This coupon has expired.', eligibleSubtotal: 0, discountAmount: 0 };
  }

  let eligibleSubtotal = 0;

  for (const item of items) {
    let isEligible = false;

    if (coupon.scope === 'marketplace') {
      isEligible = true;
    } else if (coupon.scope === 'product') {
      if (coupon.products?.some((pId) => String(pId) === String(item.product._id))) {
        isEligible = true;
      }
    } else {
      // Default to true if store/category criteria match or cannot be checked client-side
      isEligible = true;
    }

    if (isEligible) {
      eligibleSubtotal += (item.priceSnapshot || item.variant.price) * item.quantity;
    }
  }

  if (eligibleSubtotal === 0) {
    return {
      isValid: false,
      reason: 'No items in your cart qualify for this promotion.',
      eligibleSubtotal: 0,
      discountAmount: 0,
    };
  }

  if (coupon.minimumOrderValue && eligibleSubtotal < coupon.minimumOrderValue) {
    return {
      isValid: false,
      reason: `Minimum order value of $${coupon.minimumOrderValue.toFixed(2)} required.`,
      eligibleSubtotal,
      discountAmount: 0,
    };
  }

  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = eligibleSubtotal * (coupon.discountValue / 100);
    if (coupon.maximumDiscount && coupon.maximumDiscount > 0) {
      discount = Math.min(discount, coupon.maximumDiscount);
    }
  } else if (coupon.discountType === 'fixed') {
    discount = Math.min(coupon.discountValue, eligibleSubtotal);
  }

  const discountAmount = Math.round(discount * 100) / 100;

  return {
    isValid: true,
    eligibleSubtotal,
    discountAmount,
  };
}
