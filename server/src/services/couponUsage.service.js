import { CouponUsageRepository } from '../repositories/couponUsage.repository.js';

export const CouponUsageService = {
  recordUsage: async (couponId, userId, orderId, checkoutSessionId) => {
    return CouponUsageRepository.create({
      coupon: couponId,
      user: userId,
      order: orderId,
      checkoutSession: checkoutSessionId,
    });
  },

  removeUsage: async (couponId, userId, orderId) => {
    return CouponUsageRepository.deleteUsage(couponId, userId, orderId);
  },
};
