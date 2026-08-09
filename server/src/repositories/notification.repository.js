import { Notification } from '../models/notification.model.js';

export const NotificationRepository = {
  create: async (payload, session = null) => {
    const docs = await Notification.create(Array.isArray(payload) ? payload : [payload], { session });
    return Array.isArray(payload) ? docs : docs[0];
  },

  findById: (id) => Notification.findById(id),

  list: (filter = {}, opts = {}) =>
    Notification.find(filter)
      .sort(opts.sort || { createdAt: -1 })
      .skip(opts.skip || 0)
      .limit(opts.limit || 20),

  count: (filter = {}) => Notification.countDocuments(filter),

  updateById: (id, update, session = null) =>
    Notification.findByIdAndUpdate(id, update, { new: true, runValidators: true, session }),

  updateMany: (filter, update, session = null) =>
    Notification.updateMany(filter, update, { session }),

  deleteById: (id, session = null) =>
    Notification.findByIdAndDelete(id, { session }),
};
