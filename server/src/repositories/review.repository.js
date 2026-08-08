import { Review } from '../models/review.model.js';

export const ReviewRepository = {
  create: (payload) => Review.create(payload),

  findById: (id) => Review.findById(id).where({ deletedAt: null }),

  findByIdWithDeleted: (id) => Review.findById(id),

  findOne: (filter) => Review.findOne({ ...filter, deletedAt: null }),

  list: (filter = {}, opts = {}) =>
    Review.find(filter)
      .sort(opts.sort || { createdAt: -1 })
      .skip(opts.skip || 0)
      .limit(opts.limit || 20)
      .populate('user', 'firstName lastName avatar'),

  count: (filter = {}) => Review.countDocuments(filter),

  updateById: (id, update) =>
    Review.findByIdAndUpdate(id, update, { new: true }).where({ deletedAt: null }),

  softDelete: (id) =>
    Review.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true }),

  restore: (id) =>
    Review.findByIdAndUpdate(id, { deletedAt: null, isHidden: false }, { new: true }),
};
