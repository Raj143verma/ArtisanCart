import { Store } from '../models/store.model.js';

export const StoreRepository = {
  create: (payload) => Store.create(payload),

  findById: (id) => Store.findById(id).where({ deletedAt: null }),

  findByIdWithDeleted: (id) => Store.findById(id),

  findOneBySlug: (slug) => Store.findOne({ slug, deletedAt: null }),

  findOneByOwner: (ownerId) => Store.findOne({ owner: ownerId, deletedAt: null }),

  list: (filter = {}, opts = {}) =>
    Store.find(filter)
      .sort(opts.sort || { createdAt: -1 })
      .skip(opts.skip || 0)
      .limit(opts.limit || 20),

  count: (filter = {}) => Store.countDocuments(filter),

  updateById: (id, update) =>
    Store.findByIdAndUpdate(id, update, { new: true }).where({ deletedAt: null }),

  softDelete: (id) =>
    Store.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true }),

  restore: (id) =>
    Store.findByIdAndUpdate(id, { deletedAt: null }, { new: true }),
};
