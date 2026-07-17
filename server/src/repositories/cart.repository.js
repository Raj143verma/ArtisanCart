import { Cart } from '../models/cart.model.js';

export const CartRepository = {
  findByUserId: (userId) => 
    Cart.findOne({ user: userId })
      .populate({
        path: 'items.product',
        select: 'title slug images status deletedAt basePrice',
      })
      .populate({
        path: 'items.variant',
        select: 'sku price compareAtPrice attributes isActive deletedAt stockQuantity',
      }),
      
  create: (payload) => Cart.create(payload),
  
  updateByUserId: (userId, update) =>
    Cart.findOneAndUpdate(
      { user: userId },
      update,
      { new: true, runValidators: true }
    )
    .populate({
      path: 'items.product',
      select: 'title slug images status deletedAt basePrice',
    })
    .populate({
      path: 'items.variant',
      select: 'sku price compareAtPrice attributes isActive deletedAt stockQuantity',
    }),
    
  deleteByUserId: (userId) => Cart.findOneAndDelete({ user: userId }),
};
