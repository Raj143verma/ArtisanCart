import mongoose from 'mongoose';

const couponUsageSchema = new mongoose.Schema(
  {
    coupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    checkoutSession: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CheckoutSession',
      required: true,
      index: true,
    },
    usedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Compound index to quickly query/verify usage limit per user
couponUsageSchema.index({ coupon: 1, user: 1 });
couponUsageSchema.index({ coupon: 1, user: 1, checkoutSession: 1 }, { unique: true });

export const CouponUsage = mongoose.model('CouponUsage', couponUsageSchema);
