import { Category } from '../models/category.model.js';

export const CategoryRepository = {
  create: (payload) => Category.create(payload),
  findById: (id) => Category.findById(id).where({ deletedAt: null }),
  findByIdWithDeleted: (id) => Category.findById(id),
  findOneByParentAndSlug: (parent, slug) => Category.findOne({ parent, slug, deletedAt: null }),
  list: (filter = {}, opts = {}) => Category.find(filter).sort(opts.sort || { displayOrder: 1 }).skip(opts.skip || 0).limit(opts.limit || 50),
  findChildren: (parentId) => Category.find({ parent: parentId, deletedAt: null }).sort({ displayOrder: 1 }),
  findByPathPrefix: (prefix) => Category.find({ path: { $regex: `^${prefix}` }, deletedAt: null }),
  updateById: (id, update) => Category.findByIdAndUpdate(id, update, { new: true }).where({ deletedAt: null }),
  softDelete: (id) => Category.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true }),
  restore: (id) => Category.findByIdAndUpdate(id, { deletedAt: null }, { new: true }),
};
