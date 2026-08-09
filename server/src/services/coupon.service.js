import { CouponRepository } from '../repositories/coupon.repository.js';
import { CouponUsageRepository } from '../repositories/couponUsage.repository.js';
import { Product } from '../models/product.model.js';
import { Store } from '../models/store.model.js';
import { Category } from '../models/category.model.js';
import { ApiError } from '../utils/ApiError.js';

export const CouponService = {
  getCouponByCode: async (code) => {
    const coupon = await CouponRepository.findByCode(code);
    if (!coupon) {
      throw new ApiError(404, 'Coupon code is invalid or has expired.');
    }
    return coupon;
  },

  validateCouponEligibility: async (coupon, userId, items, session = null) => {
    const now = new Date();

    // 1. Basic Validity Checks
    if (!coupon.isActive || coupon.deletedAt !== null) {
      throw new ApiError(400, 'This coupon is no longer active.');
    }
    if (now < coupon.startDate) {
      throw new ApiError(400, `This coupon is not active yet. It will start on ${coupon.startDate.toLocaleString()}.`);
    }
    if (now > coupon.endDate) {
      throw new ApiError(400, 'This coupon has expired.');
    }

    // 2. Global Usage Limit Check
    if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
      throw new ApiError(400, 'This coupon has reached its maximum usage limit.');
    }

    // 3. User Restriction Check
    if (coupon.eligibleCustomers && coupon.eligibleCustomers.length > 0) {
      const isEligible = coupon.eligibleCustomers.some(
        (cId) => String(cId) === String(userId)
      );
      if (!isEligible) {
        throw new ApiError(403, 'You are not eligible to use this coupon.');
      }
    }

    // 4. Per-User Limit Check
    if (coupon.perUserLimit > 0) {
      const userUsageCount = await CouponUsageRepository.countUsage(coupon._id, userId, session);
      if (userUsageCount >= coupon.perUserLimit) {
        throw new ApiError(400, 'You have reached the maximum usage limit for this coupon.');
      }
    }

    // 5. Scope Validation: Filter items and calculate subtotal of matching items
    const eligibleItems = [];
    let eligibleSubtotal = 0;

    // Batch query products to prevent N+1 loop queries
    const productIds = [...new Set(items.map((item) => String(item.product)))];
    const products = await Product.find({ _id: { $in: productIds } })
      .populate('store')
      .populate('categories')
      .session(session);

    const productMap = new Map(products.map((p) => [String(p._id), p]));

    for (const item of items) {
      const productDoc = productMap.get(String(item.product));

      if (!productDoc || !productDoc.isActive || productDoc.deletedAt !== null) {
        continue; // Skip inactive/deleted products
      }

      // Check if store is suspended or inactive
      if (!productDoc.store || productDoc.store.status !== 'active' || productDoc.store.deletedAt !== null) {
        continue;
      }

      let isEligibleItem = false;

      if (coupon.scope === 'marketplace') {
        isEligibleItem = true;
      } else if (coupon.scope === 'store') {
        if (String(productDoc.store._id) === String(coupon.store)) {
          isEligibleItem = true;
        }
      } else if (coupon.scope === 'product') {
        if (coupon.products.some((pId) => String(pId) === String(productDoc._id))) {
          isEligibleItem = true;
        }
      } else if (coupon.scope === 'category') {
        const productCategoryIds = productDoc.categories.map((c) => String(c._id));
        // Add ancestors to support descendants
        for (const cat of productDoc.categories) {
          if (cat.ancestors && cat.ancestors.length > 0) {
            cat.ancestors.forEach((aId) => productCategoryIds.push(String(aId)));
          }
        }

        const couponCategoryIds = coupon.categories.map((cId) => String(cId));
        const matchesCategory = productCategoryIds.some((id) =>
          couponCategoryIds.includes(id)
        );

        if (matchesCategory) {
          isEligibleItem = true;
        }
      }

      if (isEligibleItem) {
        eligibleItems.push(item);
        eligibleSubtotal += item.priceSnapshot * item.quantity;
      }
    }

    if (eligibleItems.length === 0) {
      throw new ApiError(
        400,
        'Your cart does not contain any products eligible for this coupon.'
      );
    }

    // 6. Minimum Order Value Check
    if (eligibleSubtotal < coupon.minimumOrderValue) {
      throw new ApiError(
        400,
        `The subtotal of eligible items ($${eligibleSubtotal.toFixed(
          2
        )}) does not meet the minimum order requirement ($${coupon.minimumOrderValue.toFixed(
          2
        )}) for this coupon.`
      );
    }

    return {
      coupon,
      eligibleItems,
      eligibleSubtotal,
    };
  },

  calculateDiscount: (coupon, eligibleSubtotal) => {
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = eligibleSubtotal * (coupon.discountValue / 100);
      if (coupon.maximumDiscount > 0) {
        discount = Math.min(discount, coupon.maximumDiscount);
      }
    } else if (coupon.discountType === 'fixed') {
      discount = Math.min(coupon.discountValue, eligibleSubtotal);
    }

    // Round to 2 decimal places
    return Math.round(discount * 100) / 100;
  },

  allocateDiscountProportionally: (discountAmount, eligibleItems, eligibleSubtotal) => {
    if (eligibleSubtotal === 0) return eligibleItems.map(item => ({ ...item, discountAllocated: 0 }));

    let sumAllocated = 0;
    const allocatedItems = eligibleItems.map((item) => {
      const lineTotal = item.priceSnapshot * item.quantity;
      const proportion = lineTotal / eligibleSubtotal;
      const allocated = Math.round(discountAmount * proportion * 100) / 100;
      sumAllocated += allocated;
      return {
        product: item.product,
        variant: item.variant,
        quantity: item.quantity,
        priceSnapshot: item.priceSnapshot,
        discountAllocated: allocated,
      };
    });

    // Handle rounding discrepancies by adjusting the largest item or the last item
    const difference = Math.round((discountAmount - sumAllocated) * 100) / 100;
    if (difference !== 0 && allocatedItems.length > 0) {
      // Find item with largest share of discount
      let indexToAdjust = 0;
      let maxDiscount = -1;
      for (let i = 0; i < allocatedItems.length; i++) {
        if (allocatedItems[i].discountAllocated > maxDiscount) {
          maxDiscount = allocatedItems[i].discountAllocated;
          indexToAdjust = i;
        }
      }
      allocatedItems[indexToAdjust].discountAllocated = Math.round(
        (allocatedItems[indexToAdjust].discountAllocated + difference) * 100
      ) / 100;
    }

    return allocatedItems;
  },
};
