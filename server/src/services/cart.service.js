import { CartRepository } from '../repositories/cart.repository.js';
import { ProductVariantRepository } from '../repositories/productVariant.repository.js';
import { ProductRepository } from '../repositories/product.repository.js';
import { InventoryService } from './inventory.service.js';
import { ApiError } from '../utils/ApiError.js';
import { Roles } from '../constants/roles.js';

// Safe reference resolution helpers to prevent null pointer crashes
export function getVariantId(item) {
  if (!item || !item.variant) return null;
  return String(item.variant._id || item.variant);
}

export function getProductId(item) {
  if (!item || !item.product) return null;
  return String(item.product._id || item.product);
}

// Reusable validation helper for cart items
export async function validateCartItem(productId, variantId, quantity) {
  // 1. Validate Product
  const product = await ProductRepository.findById(productId);
  if (!product || product.deletedAt) {
    return { isValid: false, reason: 'product_not_found' };
  }
  if (product.status !== 'published') {
    return { isValid: false, reason: 'product_unpublished' };
  }

  // 2. Validate Variant
  const variant = await ProductVariantRepository.findById(variantId);
  if (!variant || variant.deletedAt) {
    return { isValid: false, reason: 'variant_not_found' };
  }
  if (!variant.isActive) {
    return { isValid: false, reason: 'variant_inactive' };
  }
  if (String(variant.product) !== String(productId)) {
    return { isValid: false, reason: 'variant_product_mismatch' };
  }

  // 3. Validate Available Stock
  const inventory = await InventoryService.getInventory(variantId);
  const availableStock = inventory ? inventory.available : 0;

  if (availableStock <= 0) {
    return { isValid: false, reason: 'out_of_stock', availableStock: 0, variant, product };
  }

  if (quantity > availableStock) {
    return { isValid: true, isStockLimited: true, availableStock, variant, product };
  }

  return { isValid: true, availableStock, variant, product };
}

export const CartService = {
  getOrCreateCart: async (userId, userRole) => {
    if (userRole !== Roles.CUSTOMER) {
      throw new ApiError(403, 'Only customers can manage their shopping cart.');
    }
    
    let cart = await CartRepository.findByUserId(userId);
    if (!cart) {
      cart = await CartRepository.create({ user: userId, items: [] });
      return cart;
    }

    // Sanitize stale products/variants and synchronize with current available inventory
    let hasChanges = false;
    const sanitizedItems = [];

    for (const item of cart.items) {
      const vId = getVariantId(item);
      const pId = getProductId(item);

      if (!vId || !pId) {
        hasChanges = true;
        continue; // Discard items with missing product or variant references (e.g. deleted from DB)
      }

      const validation = await validateCartItem(pId, vId, item.quantity);

      if (!validation.isValid) {
        hasChanges = true;
        continue; // Discard items where product is unpublished, variant inactive, or variant/product is soft-deleted
      }

      if (validation.isStockLimited) {
        // Automatically reduce quantity to available stock limit
        item.quantity = validation.availableStock;
        item.priceSnapshot = validation.variant.price;
        hasChanges = true;
      } else {
        // Sync price snapshot if it changed
        if (item.priceSnapshot !== validation.variant.price) {
          item.priceSnapshot = validation.variant.price;
          hasChanges = true;
        }
      }

      sanitizedItems.push(item);
    }

    if (hasChanges) {
      cart.items = sanitizedItems;
      await cart.save();
      // Fetch fresh populated cart document
      cart = await CartRepository.findByUserId(userId);
    }

    return cart;
  },

  addItem: async (userId, userRole, { productId, variantId, quantity }) => {
    if (userRole !== Roles.CUSTOMER) {
      throw new ApiError(403, 'Only customers can manage their shopping cart.');
    }

    let cart = await CartRepository.findByUserId(userId);
    if (!cart) {
      cart = await CartRepository.create({ user: userId, items: [] });
    }

    // Resolve duplicate variants to evaluate cumulative quantity
    const existingItem = cart.items.find(item => getVariantId(item) === String(variantId));
    const cumulativeQuantity = (existingItem ? existingItem.quantity : 0) + quantity;

    // Validate using reusable validation helper
    const validation = await validateCartItem(productId, variantId, cumulativeQuantity);

    if (!validation.isValid) {
      if (validation.reason === 'product_not_found') throw new ApiError(404, 'Product not found.');
      if (validation.reason === 'product_unpublished') throw new ApiError(400, 'Product is not available for purchase.');
      if (validation.reason === 'variant_not_found') throw new ApiError(404, 'Product variant not found.');
      if (validation.reason === 'variant_inactive') throw new ApiError(400, 'Product variant is currently inactive.');
      if (validation.reason === 'variant_product_mismatch') throw new ApiError(400, 'Variant does not belong to the specified product.');
      if (validation.reason === 'out_of_stock') throw new ApiError(400, 'Requested quantity exceeds available stock. Only 0 units available.');
    }

    if (validation.isStockLimited) {
      throw new ApiError(
        400,
        `Requested quantity exceeds available stock. Only ${validation.availableStock} units available.`
      );
    }

    // Merge or push new item
    if (existingItem) {
      existingItem.quantity = cumulativeQuantity;
      existingItem.priceSnapshot = validation.variant.price;
    } else {
      cart.items.push({
        product: productId,
        variant: variantId,
        quantity,
        priceSnapshot: validation.variant.price,
      });
    }

    await cart.save();
    return CartRepository.findByUserId(userId);
  },

  updateQuantity: async (userId, userRole, variantId, quantity) => {
    if (userRole !== Roles.CUSTOMER) {
      throw new ApiError(403, 'Only customers can manage their shopping cart.');
    }

    let cart = await CartRepository.findByUserId(userId);
    if (!cart) {
      throw new ApiError(404, 'Cart not found.');
    }

    const item = cart.items.find(item => getVariantId(item) === String(variantId));
    if (!item) {
      throw new ApiError(404, 'Item not found in cart.');
    }

    const pId = getProductId(item);

    // Validate using reusable validation helper
    const validation = await validateCartItem(pId, variantId, quantity);

    if (!validation.isValid) {
      if (validation.reason === 'product_not_found') throw new ApiError(404, 'Product not found.');
      if (validation.reason === 'product_unpublished') throw new ApiError(400, 'Product is not available for purchase.');
      if (validation.reason === 'variant_not_found') throw new ApiError(404, 'Product variant not found.');
      if (validation.reason === 'variant_inactive') throw new ApiError(400, 'Product variant is currently inactive.');
      if (validation.reason === 'variant_product_mismatch') throw new ApiError(400, 'Variant does not belong to the specified product.');
      if (validation.reason === 'out_of_stock') throw new ApiError(400, 'Requested quantity exceeds available stock. Only 0 units available.');
    }

    if (validation.isStockLimited) {
      throw new ApiError(
        400,
        `Requested quantity exceeds available stock. Only ${validation.availableStock} units available.`
      );
    }

    item.quantity = quantity;
    item.priceSnapshot = validation.variant.price;

    await cart.save();
    return CartRepository.findByUserId(userId);
  },

  removeItem: async (userId, userRole, variantId) => {
    if (userRole !== Roles.CUSTOMER) {
      throw new ApiError(403, 'Only customers can manage their shopping cart.');
    }

    let cart = await CartRepository.findByUserId(userId);
    if (!cart) {
      throw new ApiError(404, 'Cart not found.');
    }

    cart.items = cart.items.filter(item => getVariantId(item) !== String(variantId));
    await cart.save();

    return CartRepository.findByUserId(userId);
  },

  clearCart: async (userId, userRole) => {
    if (userRole !== Roles.CUSTOMER) {
      throw new ApiError(403, 'Only customers can manage their shopping cart.');
    }

    let cart = await CartRepository.findByUserId(userId);
    if (!cart) {
      throw new ApiError(404, 'Cart not found.');
    }

    cart.items = [];
    await cart.save();

    return cart;
  },
};
