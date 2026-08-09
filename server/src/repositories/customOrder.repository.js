import { CustomOrder } from '../models/customOrder.model.js';

export const CustomOrderRepository = {
  create: async (payload, session = null) => {
    const docs = await CustomOrder.create(Array.isArray(payload) ? payload : [payload], { session });
    return Array.isArray(payload) ? docs : docs[0];
  },

  findById: (id) => CustomOrder.findById(id),

  findByIdWithPopulated: (id) =>
    CustomOrder.findById(id)
      .populate('user', 'firstName lastName email')
      .populate('store', 'name slug owner'),

  list: (filter = {}, opts = {}) =>
    CustomOrder.find(filter)
      .sort(opts.sort || { createdAt: -1 })
      .skip(opts.skip || 0)
      .limit(opts.limit || 20)
      .populate('user', 'firstName lastName email')
      .populate('store', 'name slug owner'),

  count: (filter = {}) => CustomOrder.countDocuments(filter),

  updateById: (id, update, session = null) =>
    CustomOrder.findByIdAndUpdate(id, update, { new: true, runValidators: true, session }),

  updateStatusAtomic: (id, allowedStatuses, nextStatus, updatePayload = {}, session = null) =>
    CustomOrder.findOneAndUpdate(
      {
        _id: id,
        status: { $in: allowedStatuses },
      },
      {
        $set: {
          status: nextStatus,
          ...updatePayload,
        },
      },
      { new: true, runValidators: true, session }
    ),
};
