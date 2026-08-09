import { CouponUsage } from '../models/couponUsage.model.js';

export const CouponUsageRepository = {
  countUsage: async (couponId, userId, session = null) => {
    const query = CouponUsage.distinct('checkoutSession', { coupon: couponId, user: userId });
    if (session) {
      query.session(session);
    }
    const sessions = await query;
    return sessions.length;
  },

  create: (payload, session = null) => {
    return CouponUsage.create(Array.isArray(payload) ? payload : [payload], { session });
  },

  deleteUsage: (couponId, userId, orderId, session = null) => {
    const query = CouponUsage.deleteOne({ coupon: couponId, user: userId, order: orderId });
    if (session) {
      query.session(session);
    }
    return query;
  },
    
  deleteByOrderId: (orderId, session = null) => {
    const query = CouponUsage.deleteMany({ order: orderId });
    if (session) {
      query.session(session);
    }
    return query;
  },
};
