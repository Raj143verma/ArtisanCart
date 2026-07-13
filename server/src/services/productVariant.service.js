import { ProductVariantRepository } from '../repositories/productVariant.repository.js';
import { ProductRepository } from '../repositories/product.repository.js';
import { Store } from '../models/store.model.js';
import { Product } from '../models/product.model.js';
import { ProductVariant } from '../models/productVariant.model.js';
import { ApiError } from '../utils/ApiError.js';
import { Roles } from '../constants/roles.js';

async function verifyStoreOwnershipAndStatus(userId, productStoreId) {
  const store = await Store.findOne({ owner: userId });
  if (!store) {
    throw new ApiError(404, 'Store not found. You must create a store before managing products.');
  }
  if (!store.isApproved) {
    throw new ApiError(403, 'Your store is pending approval. You cannot list or manage products.');
  }
  if (String(productStoreId) !== String(store._id)) {
    throw new ApiError(403, 'Unauthorized access to this product.');
  }
  return store;
}

function getNormalizedAttributes(attributes) {
  if (!attributes) return {};
  
  let plain = {};
  if (typeof attributes.toObject === 'function') {
    plain = attributes.toObject();
  } else if (attributes instanceof Map) {
    plain = Object.fromEntries(attributes);
  } else {
    plain = attributes;
  }

  const normalized = {};
  for (const [key, val] of Object.entries(plain)) {
    const normKey = String(key).trim().toLowerCase();
    const normVal = String(val).trim().toLowerCase();
    normalized[normKey] = normVal;
  }
  return normalized;
}

function hasAttributeCollision(siblingVariants, newAttributes, excludeVariantId = null) {
  const normNew = getNormalizedAttributes(newAttributes);
  const newKeys = Object.keys(normNew);

  return siblingVariants.some((v) => {
    if (excludeVariantId && String(v._id) === String(excludeVariantId)) {
      return false;
    }

    const normExisting = getNormalizedAttributes(v.attributes);
    const existingKeys = Object.keys(normExisting);

    if (existingKeys.length !== newKeys.length) {
      return false;
    }

    return newKeys.every((key) => normExisting[key] === normNew[key]);
  });
}

async function updateProductVariantsFlag(productId) {
  const activeVariantsCount = await ProductVariantRepository.count({
    product: productId,
    deletedAt: null,
    isActive: true,
  });
  const hasVariants = activeVariantsCount > 0;
  await ProductRepository.updateById(productId, { hasVariants });
}

export const ProductVariantService = {
  create: async (productId, payload, userId) => {
    // 1. Fetch parent product
    const product = await ProductRepository.findById(productId);
    if (!product) {
      throw new ApiError(404, 'Product not found.');
    }

    // 2. Verify seller ownership
    await verifyStoreOwnershipAndStatus(userId, product.store);

    // 3. Verify SKU uniqueness (including soft-deleted variants)
    const existingSku = await ProductVariantRepository.findOneBySkuWithDeleted(payload.sku);
    if (existingSku) {
      throw new ApiError(400, `SKU ${payload.sku} is already in use.`);
    }

    // 4. Verify attribute combination uniqueness (ignore case, whitespace)
    const siblings = await ProductVariantRepository.findActiveByProduct(productId);
    if (hasAttributeCollision(siblings, payload.attributes)) {
      throw new ApiError(
        400,
        'A variant with the exact same attribute combination already exists for this product.',
      );
    }

    // 5. Create variant
    const variant = await ProductVariantRepository.create({
      ...payload,
      product: productId,
    });

    // 6. Update parent hasVariants flag
    await updateProductVariantsFlag(productId);

    return variant;
  },

  update: async (variantId, payload, userId, userRole) => {
    const variant = await ProductVariantRepository.findById(variantId);
    if (!variant) {
      throw new ApiError(404, 'Product variant not found.');
    }

    const product = await ProductRepository.findById(variant.product);
    if (!product) {
      throw new ApiError(404, 'Parent product not found.');
    }

    if (userRole !== Roles.SUPER_ADMIN) {
      await verifyStoreOwnershipAndStatus(userId, product.store);
    }

    // If SKU is changing, verify uniqueness (including soft-deleted variants)
    if (payload.sku && payload.sku !== variant.sku) {
      const existingSku = await ProductVariantRepository.findOneBySkuWithDeletedExcludingId(
        payload.sku,
        variantId,
      );
      if (existingSku) {
        throw new ApiError(400, `SKU ${payload.sku} is already in use.`);
      }
    }

    // If attributes are changing, verify combination uniqueness
    if (payload.attributes) {
      const siblings = await ProductVariantRepository.findActiveByProduct(variant.product);
      if (hasAttributeCollision(siblings, payload.attributes, variantId)) {
        throw new ApiError(
          400,
          'A variant with the exact same attribute combination already exists for this product.',
        );
      }
    }

    const updated = await ProductVariantRepository.updateById(variantId, payload);

    // In case isActive status changed, synchronize parent hasVariants flag
    if (payload.hasOwnProperty('isActive')) {
      await updateProductVariantsFlag(variant.product);
    }

    return updated;
  },

  softDelete: async (variantId, userId, userRole) => {
    const variant = await ProductVariantRepository.findById(variantId);
    if (!variant) {
      throw new ApiError(404, 'Product variant not found.');
    }

    const product = await ProductRepository.findById(variant.product);
    if (!product) {
      throw new ApiError(404, 'Parent product not found.');
    }

    if (userRole !== Roles.SUPER_ADMIN) {
      await verifyStoreOwnershipAndStatus(userId, product.store);
    }

    const deleted = await ProductVariantRepository.softDelete(variantId);
    
    // Update hasVariants flag
    await updateProductVariantsFlag(variant.product);

    return deleted;
  },

  restore: async (variantId, userId, userRole) => {
    const variant = await ProductVariantRepository.findByIdWithDeleted(variantId);
    if (!variant) {
      throw new ApiError(404, 'Product variant not found.');
    }

    const product = await ProductRepository.findByIdWithDeleted(variant.product);
    if (!product || product.deletedAt) {
      throw new ApiError(400, 'Cannot restore variant for a deleted product.');
    }

    if (userRole !== Roles.SUPER_ADMIN) {
      await verifyStoreOwnershipAndStatus(userId, product.store);
    }

    const restored = await ProductVariantRepository.restore(variantId);

    // Update hasVariants flag
    await updateProductVariantsFlag(variant.product);

    return restored;
  },

  getById: async (variantId) => {
    return ProductVariantRepository.findById(variantId);
  },

  listForProduct: async (productId, userRole = null, userId = null) => {
    const product = await ProductRepository.findById(productId);
    if (!product) {
      throw new ApiError(404, 'Product not found.');
    }

    const filter = { product: productId, deletedAt: null };

    // Visibility rules:
    // Customers can only see active variants.
    // Sellers/Admins can see all variants.
    let isOwnerOrAdmin = false;
    if (userRole === Roles.SUPER_ADMIN) {
      isOwnerOrAdmin = true;
    } else if (userRole === Roles.SELLER && userId) {
      const store = await Store.findOne({ owner: userId });
      if (store && String(product.store) === String(store._id)) {
        isOwnerOrAdmin = true;
      }
    }

    if (!isOwnerOrAdmin) {
      filter.isActive = true;
    }

    return ProductVariantRepository.list(filter, { sort: { createdAt: 1 } });
  },

  toggleActive: async (variantId, value, userId, userRole) => {
    const variant = await ProductVariantRepository.findById(variantId);
    if (!variant) {
      throw new ApiError(404, 'Product variant not found.');
    }

    const product = await ProductRepository.findById(variant.product);
    if (!product) {
      throw new ApiError(404, 'Parent product not found.');
    }

    if (userRole !== Roles.SUPER_ADMIN) {
      await verifyStoreOwnershipAndStatus(userId, product.store);
    }

    const updated = await ProductVariantRepository.updateById(variantId, { isActive: value });
    
    // Synchronize parent hasVariants flag
    await updateProductVariantsFlag(variant.product);

    return updated;
  },
};
