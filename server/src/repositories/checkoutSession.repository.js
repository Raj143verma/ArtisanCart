import { CheckoutSession } from '../models/checkoutSession.model.js';

export const CheckoutSessionRepository = {
  findById: (id) => 
    CheckoutSession.findById(id)
      .populate({
        path: 'items.product',
        select: 'title slug images basePrice status',
      })
      .populate({
        path: 'items.variant',
        select: 'sku price compareAtPrice attributes isActive stockQuantity',
      }),
      
  findActiveByUserId: (userId) =>
    CheckoutSession.findOne({ user: userId, status: 'active' })
      .populate({
        path: 'items.product',
        select: 'title slug images basePrice status',
      })
      .populate({
        path: 'items.variant',
        select: 'sku price compareAtPrice attributes isActive stockQuantity',
      }),
      
  create: (payload) => CheckoutSession.create(payload),
  
  updateById: (id, update) =>
    CheckoutSession.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .populate({
        path: 'items.product',
        select: 'title slug images basePrice status',
      })
      .populate({
        path: 'items.variant',
        select: 'sku price compareAtPrice attributes isActive stockQuantity',
      }),

  updateStatusAtomic: (id, currentStatus, newStatus) =>
    CheckoutSession.findOneAndUpdate(
      { _id: id, status: currentStatus },
      { $set: { status: newStatus } },
      { new: false } // Returns old document so service can read items for stock restoration
    ),
};
