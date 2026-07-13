import { ProductVariant } from '../models/productVariant.model.js';

export const ProductVariantRepository = {
  create: (payload) => ProductVariant.create(payload),
  
  findById: (id) => ProductVariant.findById(id).where({ deletedAt: null }),
  
  findByIdWithDeleted: (id) => ProductVariant.findById(id),
  
  findOneBySku: (sku) => ProductVariant.findOne({ sku, deletedAt: null }),
  
  findOneBySkuWithDeleted: (sku) => ProductVariant.findOne({ sku }),

  findOneBySkuWithDeletedExcludingId: (sku, id) => ProductVariant.findOne({ sku, _id: { $ne: id } }),

  findActiveByProduct: (productId) => ProductVariant.find({ product: productId, deletedAt: null }),
  
  list: (filter = {}, opts = {}) => 
    ProductVariant.find(filter)
      .sort(opts.sort || { createdAt: -1 })
      .skip(opts.skip || 0)
      .limit(opts.limit || 50),
      
  count: (filter = {}) => ProductVariant.countDocuments(filter),
  
  updateById: (id, update) => 
    ProductVariant.findByIdAndUpdate(id, update, { new: true }).where({ deletedAt: null }),
    
  softDelete: (id) => 
    ProductVariant.findByIdAndUpdate(id, { deletedAt: new Date() }, { new: true }),
    
  restore: (id) => 
    ProductVariant.findByIdAndUpdate(id, { deletedAt: null }, { new: true }),
};
