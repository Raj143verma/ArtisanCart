import { WishlistRepository } from '../repositories/wishlist.repository.js';
import { Wishlist } from '../models/wishlist.model.js';
import { Product } from '../models/product.model.js';
import { ProductVariant } from '../models/productVariant.model.js';
import { Inventory } from '../models/inventory.model.js';
import { Store } from '../models/store.model.js';
import { ApiError } from '../utils/ApiError.js';
import { Roles } from '../constants/roles.js';

// Wait! In node imports, the filename is productVariant.model.js, so we should import it with matching case. Let's double check.
// Yes, productVariant.model.js has uppercase V. Let's import it exactly: '../models/productVariant.model.js'.

export const WishlistService = {
  add: async (payload, userId, userRole) => {
    if (userRole !== Roles.CUSTOMER) {
      throw new ApiError(403, 'Only customers can manage wishlists.');
    }

    const { productId, variantId } = payload;

    // 1. Get or create wishlist document for user
    let wishlist = await WishlistRepository.findByUserId(userId);
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: userId, items: [] });
    }

    // 2. Validate product exists and is active/published
    const product = await Product.findById(productId);
    if (!product || product.deletedAt !== null) {
      throw new ApiError(400, 'Product not found or has been deleted.');
    }

    if (product.status !== 'published') {
      throw new ApiError(400, 'Product is not published.');
    }

    if (!product.isActive) {
      throw new ApiError(400, 'Product is inactive.');
    }

    // 3. Validate product store is active and approved
    const store = await Store.findById(product.store);
    if (!store || store.deletedAt !== null || store.status !== 'active') {
      throw new ApiError(400, 'Store is suspended or inactive.');
    }

    // 4. Validate variant exists and is active
    // Wait! Let's import ProductVariant using exact name: import { ProductVariant } from '../models/productVariant.model.js';
    const variant = await ProductVariant.findById(variantId);
    if (!variant || variant.deletedAt !== null) {
      throw new ApiError(400, 'Variant not found or has been deleted.');
    }

    if (!variant.isActive) {
      throw new ApiError(400, 'Variant is inactive.');
    }

    // 5. Validate variant belongs to the product
    if (String(variant.product) !== String(productId)) {
      throw new ApiError(400, 'Variant does not belong to the specified product.');
    }

    // 6. Check size limit of 250 items
    if (wishlist.items.length >= 250) {
      throw new ApiError(400, 'Wishlist limit of 250 items exceeded.');
    }

    // 7. Atomic add to set
    const updatedWishlist = await WishlistRepository.addItem(userId, productId, variantId);
    if (!updatedWishlist) {
      // Re-verify if it failed due to limit
      const currentLength = await WishlistRepository.countItems(userId);
      if (currentLength >= 250) {
        throw new ApiError(400, 'Wishlist limit of 250 items exceeded.');
      }
      // Otherwise, it was a duplicate request. Fetch the latest state to return up-to-date data.
      const freshWishlist = await WishlistRepository.findByUserId(userId);
      return freshWishlist || wishlist;
    }

    return updatedWishlist;
  },

  remove: async (payload, userId, userRole) => {
    if (userRole !== Roles.CUSTOMER) {
      throw new ApiError(403, 'Only customers can manage wishlists.');
    }

    const { productId, variantId } = payload;
    const updated = await WishlistRepository.removeItem(userId, productId, variantId);
    if (!updated) {
      return { items: [] };
    }
    return updated;
  },

  clear: async (userId, userRole) => {
    if (userRole !== Roles.CUSTOMER) {
      throw new ApiError(403, 'Only customers can manage wishlists.');
    }

    const updated = await WishlistRepository.clear(userId);
    if (!updated) {
      return { items: [] };
    }
    return updated;
  },

  check: async (productId, variantId, userId, userRole) => {
    if (userRole !== Roles.CUSTOMER) {
      throw new ApiError(403, 'Only customers can check wishlist status.');
    }

    const isWishlisted = await WishlistRepository.checkItem(userId, productId, variantId);
    return { isWishlisted };
  },

  getWishlist: async (query, userId, userRole) => {
    if (userRole !== Roles.CUSTOMER) {
      throw new ApiError(403, 'Only customers can view wishlists.');
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const results = await WishlistRepository.getPaginatedItems(userId, skip, limit);
    const total = results[0]?.metadata[0]?.total || 0;
    const docs = results[0]?.data || [];

    // Auxiliary batch query to resolve live inventory values for paginated elements
    const variantIds = docs.map((doc) => doc.variant._id);
    const inventories = await Inventory.find({ variant: { $in: variantIds } });

    const inventoryMap = {};
    inventories.forEach((inv) => {
      inventoryMap[inv.variant.toString()] = {
        available: inv.available,
        status: inv.status,
      };
    });

    const itemsWithInventory = docs.map((doc) => {
      const inv = inventoryMap[doc.variant._id.toString()] || {
        available: 0,
        status: 'out_of_stock',
      };
      return {
        product: doc.product,
        variant: doc.variant,
        store: doc.store,
        inventory: inv,
        addedAt: doc.addedAt,
        isWishlisted: true,
      };
    });

    return {
      docs: itemsWithInventory,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  },
};
