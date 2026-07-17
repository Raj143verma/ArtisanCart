import { Transaction } from '../models/transaction.model.js';

export const TransactionRepository = {
  findById: (id) =>
    Transaction.findById(id).populate({
      path: 'orders',
      select: 'orderNumber status pricing items',
    }),
    
  findByIdempotencyKey: (key) =>
    Transaction.findOne({ idempotencyKey: key }).populate({
      path: 'orders',
      select: 'orderNumber status pricing items',
    }),
    
  findByUserId: (userId) =>
    Transaction.find({ user: userId })
      .populate({
        path: 'orders',
        select: 'orderNumber status pricing items',
      })
      .sort({ createdAt: -1 }),
      
  create: (payload) => Transaction.create(payload),
  
  updateById: (id, update) =>
    Transaction.findByIdAndUpdate(id, update, { new: true, runValidators: true }).populate({
      path: 'orders',
      select: 'orderNumber status pricing items',
    }),
    
  updateStatusAtomic: (id, currentStatus, newStatus, updateFields = {}) =>
    Transaction.findOneAndUpdate(
      { _id: id, paymentStatus: currentStatus },
      { $set: { paymentStatus: newStatus, ...updateFields } },
      { new: true } // Returns updated document
    ).populate({
      path: 'orders',
      select: 'orderNumber status pricing items',
    }),
};
