import { Coupon } from '../models/coupon.model.js';

export const CouponRepository = {
  findById: (id) => Coupon.findById(id),

  findByCode: (code) =>
    Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
      deletedAt: null,
    }),

  create: (payload) => Coupon.create(payload),

  updateById: (id, update) =>
    Coupon.findByIdAndUpdate(id, update, { new: true, runValidators: true }),

  incrementUsageCountAtomic: async (id) => {
    // Increment usageCount only if usageLimit is 0 (unlimited) or usageCount < usageLimit
    return Coupon.findOneAndUpdate(
      {
        _id: id,
        isActive: true,
        deletedAt: null,
        $or: [
          { usageLimit: 0 },
          { $expr: { $lt: ['$usageCount', '$usageLimit'] } },
        ],
      },
      { $inc: { usageCount: 1 } },
      { new: true }
    );
  },

  decrementUsageCountAtomic: async (id) => {
    return Coupon.findByIdAndUpdate(
      id,
      { $inc: { usageCount: -1 } },
      { new: true }
    );
  },
};
