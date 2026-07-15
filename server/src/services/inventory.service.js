import { InventoryRepository } from '../repositories/inventory.repository.js';
import { ProductVariantRepository } from '../repositories/productVariant.repository.js';
import { ProductRepository } from '../repositories/product.repository.js';
import { Store } from '../models/store.model.js';
import { ApiError } from '../utils/ApiError.js';
import { Roles } from '../constants/roles.js';

async function verifyStoreOwnershipAndStatus(userId, productStoreId) {
  const store = await Store.findOne({ owner: userId });
  if (!store) {
    throw new ApiError(404, 'Store not found. You must create a store before managing inventory.');
  }
  if (!store.isApproved) {
    throw new ApiError(403, 'Your store is pending approval. You cannot manage inventory.');
  }
  if (String(productStoreId) !== String(store._id)) {
    throw new ApiError(403, 'Unauthorized access to this product inventory.');
  }
  return store;
}

async function getOrInitInventory(variant) {
  let inventory = await InventoryRepository.findByVariantId(variant._id);
  if (!inventory) {
    inventory = await InventoryRepository.create({
      product: variant.product,
      variant: variant._id,
      available: variant.stockQuantity || 0,
      lowStockThreshold: 5,
    });
  }
  return inventory;
}

async function syncParentProductStock(productId) {
  const activeVariants = await ProductVariantRepository.findActiveByProduct(productId);
  const totalStock = activeVariants.reduce((sum, v) => sum + (v.isActive ? (v.stockQuantity || 0) : 0), 0);
  await ProductRepository.updateById(productId, { stockQuantity: totalStock });
}

export const InventoryService = {
  syncParentProductStock,

  getInventory: async (variantId) => {
    const variant = await ProductVariantRepository.findById(variantId);
    if (!variant) {
      throw new ApiError(404, 'Product variant not found.');
    }
    
    return getOrInitInventory(variant);
  },

  adjustInventory: async (variantId, adjustment, userId, userRole) => {
    const variant = await ProductVariantRepository.findById(variantId);
    if (!variant) {
      throw new ApiError(404, 'Product variant not found.');
    }

    const product = await ProductRepository.findById(variant.product);
    if (!product) {
      throw new ApiError(404, 'Parent product not found or has been deleted.');
    }

    if (userRole !== Roles.SUPER_ADMIN) {
      await verifyStoreOwnershipAndStatus(userId, product.store);
    }

    // Ensure inventory document is initialized
    await getOrInitInventory(variant);

    // Atomic adjustment using repository
    const inventory = await InventoryRepository.adjustStockAtomic(variantId, adjustment);
    if (!inventory) {
      throw new ApiError(
        400,
        `Insufficient stock available. Requested adjustment: ${adjustment}`
      );
    }

    // Synchronize variant stock quantity
    await ProductVariantRepository.updateById(variantId, { stockQuantity: inventory.available });

    // Synchronize parent product stock
    await syncParentProductStock(product._id);

    return inventory;
  },

  restockInventory: async (variantId, quantity, userId, userRole) => {
    const variant = await ProductVariantRepository.findById(variantId);
    if (!variant) {
      throw new ApiError(404, 'Product variant not found.');
    }

    const product = await ProductRepository.findById(variant.product);
    if (!product) {
      throw new ApiError(404, 'Parent product not found or has been deleted.');
    }

    if (userRole !== Roles.SUPER_ADMIN) {
      await verifyStoreOwnershipAndStatus(userId, product.store);
    }

    // Ensure inventory document is initialized
    await getOrInitInventory(variant);

    // Atomic restock using repository (positive adjustment)
    const inventory = await InventoryRepository.adjustStockAtomic(variantId, quantity);
    if (!inventory) {
      throw new ApiError(400, 'Failed to restock inventory.');
    }

    // Synchronize variant stock quantity
    await ProductVariantRepository.updateById(variantId, { stockQuantity: inventory.available });

    // Synchronize parent product stock
    await syncParentProductStock(product._id);

    return inventory;
  },

  setLowStockThreshold: async (variantId, threshold, userId, userRole) => {
    const variant = await ProductVariantRepository.findById(variantId);
    if (!variant) {
      throw new ApiError(404, 'Product variant not found.');
    }

    const product = await ProductRepository.findById(variant.product);
    if (!product) {
      throw new ApiError(404, 'Parent product not found or has been deleted.');
    }

    if (userRole !== Roles.SUPER_ADMIN) {
      await verifyStoreOwnershipAndStatus(userId, product.store);
    }

    const inventory = await getOrInitInventory(variant);
    inventory.lowStockThreshold = threshold;
    await inventory.save();

    return inventory;
  },
};
