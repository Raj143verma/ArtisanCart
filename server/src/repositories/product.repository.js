import { Product } from '../models/product.model.js';

export const ProductRepository = {
  create: (payload) => Product.create(payload),
  
  findById: (id) => Product.findById(id).where({ deletedAt: null }),
  
  findByIdWithDeleted: (id) => Product.findById(id),
  
  findOneBySlug: (slug) => Product.findOne({ slug, deletedAt: null }),
  
  list: (filter = {}, opts = {}) => 
    Product.find(filter)
      .sort(opts.sort || { createdAt: -1 })
      .skip(opts.skip || 0)
      .limit(opts.limit || 20),
      
  count: (filter = {}) => Product.countDocuments(filter),
  
  updateById: (id, update) => 
    Product.findByIdAndUpdate(id, update, { new: true }).where({ deletedAt: null }),
    
  softDelete: (id) => 
    Product.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true }),
    
  restore: (id) => 
    Product.findByIdAndUpdate(id, { deletedAt: null }, { new: true }),
};
