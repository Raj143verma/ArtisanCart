import { Order } from '../models/order.model.js';

export const OrderRepository = {
  findById: (id) => Order.findById(id),
  
  findByCustomerId: (customerId) =>
    Order.find({ customer: customerId }).sort({ createdAt: -1 }),
    
  findBySellerId: (sellerId) =>
    Order.find({ seller: sellerId }).sort({ createdAt: -1 }),
    
  create: (payload) => Order.create(payload),
  
  updateById: (id, update) =>
    Order.findByIdAndUpdate(id, update, { new: true, runValidators: true }),
    
  updateStatusAtomic: (id, allowedCurrentStatuses, targetStatus, updateFields = {}) =>
    Order.findOneAndUpdate(
      { _id: id, status: { $in: allowedCurrentStatuses } },
      { $set: { status: targetStatus, ...updateFields } },
      { new: false } // Returns old document so service can read items for stock restoration on cancellation
    ),
};
