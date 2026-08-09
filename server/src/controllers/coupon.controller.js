import { asyncHandler } from '../utils/asyncHandler.js';
import { CouponRepository } from '../repositories/coupon.repository.js';
import { Store } from '../models/store.model.js';
import { Coupon } from '../models/coupon.model.js';
import { Product } from '../models/product.model.js';
import { ApiError } from '../utils/ApiError.js';
import { Roles } from '../constants/roles.js';
import { createSuccessResponse } from '../helpers/responseHelper.js';

async function validateCouponScopeAndOwnership(payload, userRole, storeId) {
  // 1. Marketplace scope checks
  if (payload.scope === 'marketplace') {
    if (userRole !== Roles.SUPER_ADMIN) {
      throw new ApiError(403, 'Sellers are not permitted to create marketplace-wide coupons.');
    }
    payload.store = null;
    payload.products = [];
    payload.categories = [];
  }

  // 2. Store scope checks
  if (payload.scope === 'store') {
    if (!storeId) {
      throw new ApiError(400, 'Store ID is required for store-scoped coupons.');
    }
    payload.store = storeId;
    payload.products = [];
    payload.categories = [];
  }

  // 3. Product scope checks
  if (payload.scope === 'product') {
    if (!storeId) {
      throw new ApiError(400, 'Store ID is required for product-scoped coupons.');
    }
    payload.store = storeId;
    if (!payload.products || payload.products.length === 0) {
      throw new ApiError(400, 'At least one product must be selected for product-scoped coupons.');
    }
    // Verify all products belong to the store
    const productCount = await Product.countDocuments({
      _id: { $in: payload.products },
      store: storeId,
      deletedAt: null,
    });
    if (productCount !== payload.products.length) {
      throw new ApiError(400, 'All selected products must belong to the selected store.');
    }
    payload.categories = [];
  }

  // 4. Category scope checks
  if (payload.scope === 'category') {
    if (!storeId) {
      throw new ApiError(400, 'Store ID is required for category-scoped coupons.');
    }
    payload.store = storeId;
    if (!payload.categories || payload.categories.length === 0) {
      throw new ApiError(400, 'At least one category must be selected for category-scoped coupons.');
    }
    // Verify that the seller has at least one active product matching each selected category
    for (const catId of payload.categories) {
      const hasProductInCategory = await Product.findOne({
        store: storeId,
        categories: catId,
        isActive: true,
        deletedAt: null,
      });
      if (!hasProductInCategory) {
        throw new ApiError(400, `No active products in this store belong to category ${catId}.`);
      }
    }
    payload.products = [];
  }
}

export const createCoupon = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;
  const payload = req.body;

  let storeId = null;
  if (userRole === Roles.SELLER) {
    const store = await Store.findOne({ owner: userId, status: 'active', deletedAt: null });
    if (!store) {
      throw new ApiError(400, 'You must have an active store to create coupons.');
    }
    storeId = store._id;
    payload.store = store._id;
  } else if (userRole === Roles.SUPER_ADMIN && payload.store) {
    storeId = payload.store;
  }

  await validateCouponScopeAndOwnership(payload, userRole, storeId);

  // Set creator
  payload.createdBy = userId;

  const coupon = await CouponRepository.create(payload);
  return res.status(201).json(createSuccessResponse(coupon, 'Coupon created successfully'));
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;
  const { id } = req.params;
  const payload = req.body;

  const coupon = await CouponRepository.findById(id);
  if (!coupon || coupon.deletedAt !== null) {
    throw new ApiError(404, 'Coupon not found.');
  }

  let storeId = coupon.store;

  if (userRole === Roles.SELLER) {
    const store = await Store.findOne({ owner: userId, status: 'active', deletedAt: null });
    if (!store || String(coupon.store) !== String(store._id)) {
      throw new ApiError(403, 'You do not have permission to update this coupon.');
    }
    storeId = store._id;
    // Block seller from modifying store ownership directly
    delete payload.store;
    payload.store = store._id;
  }

  // Merge update with current coupon to validate scope rules correctly
  const merged = {
    scope: payload.scope !== undefined ? payload.scope : coupon.scope,
    store: storeId,
    products: payload.products !== undefined ? payload.products : coupon.products,
    categories: payload.categories !== undefined ? payload.categories : coupon.categories,
  };

  // Chronological date validation against the merged coupon state
  const mergedStartDate = payload.startDate !== undefined ? new Date(payload.startDate) : new Date(coupon.startDate);
  const mergedEndDate = payload.endDate !== undefined ? new Date(payload.endDate) : new Date(coupon.endDate);
  if (mergedEndDate < mergedStartDate) {
    throw new ApiError(400, 'End date cannot be earlier than start date.');
  }

  await validateCouponScopeAndOwnership(merged, userRole, storeId);

  // Apply cleaned/mutated association properties back to the database update payload
  payload.products = merged.products;
  payload.categories = merged.categories;
  payload.store = merged.store;
  payload.scope = merged.scope;

  const updated = await CouponRepository.updateById(id, payload);
  return res.json(createSuccessResponse(updated, 'Coupon updated successfully'));
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;
  const { id } = req.params;

  const coupon = await CouponRepository.findById(id);
  if (!coupon || coupon.deletedAt !== null) {
    throw new ApiError(404, 'Coupon not found.');
  }

  if (userRole === Roles.SELLER) {
    const store = await Store.findOne({ owner: userId, status: 'active', deletedAt: null });
    if (!store || String(coupon.store) !== String(store._id)) {
      throw new ApiError(403, 'You do not have permission to delete this coupon.');
    }
  }

  // Soft delete coupon
  const deleted = await CouponRepository.updateById(id, {
    deletedAt: new Date(),
    isActive: false,
  });

  return res.json(createSuccessResponse(deleted, 'Coupon deleted successfully'));
});

export const getCouponById = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;
  const { id } = req.params;

  const coupon = await CouponRepository.findById(id);
  if (!coupon || coupon.deletedAt !== null) {
    throw new ApiError(404, 'Coupon not found.');
  }

  if (userRole === Roles.SELLER) {
    const store = await Store.findOne({ owner: userId, status: 'active', deletedAt: null });
    if (!store || String(coupon.store) !== String(store._id)) {
      throw new ApiError(403, 'You do not have permission to view this coupon.');
    }
  }

  return res.json(createSuccessResponse(coupon, 'Coupon retrieved successfully'));
});

export const listCoupons = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;
  const { page = 1, limit = 20, isActive, scope } = req.query;

  const filter = { deletedAt: null };

  if (isActive !== undefined) {
    filter.isActive = isActive;
  }

  if (scope !== undefined) {
    filter.scope = scope;
  }

  if (userRole === Roles.CUSTOMER) {
    // Customers can see active public coupons
    filter.isActive = true;
    filter.endDate = { $gte: new Date() };
    filter.$or = [
      { eligibleCustomers: { $size: 0 } },
      { eligibleCustomers: userId },
    ];
  } else if (userRole === Roles.SELLER) {
    // Sellers can see marketplace coupons or coupons created for their store
    const store = await Store.findOne({ owner: userId, status: 'active', deletedAt: null });
    if (store) {
      filter.$or = [
        { scope: 'marketplace' },
        { store: store._id },
      ];
    } else {
      filter.scope = 'marketplace';
    }
  }

  const skip = (page - 1) * limit;
  const items = await Coupon.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  const total = await Coupon.countDocuments(filter);

  return res.json(
    createSuccessResponse(items, 'Coupons retrieved successfully', {
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / limit),
    })
  );
});
