import mongoose from 'mongoose';
import { OrderRepository } from '../repositories/order.repository.js';
import { CheckoutSessionRepository } from '../repositories/checkoutSession.repository.js';
import { ProductRepository } from '../repositories/product.repository.js';
import { ProductVariantRepository } from '../repositories/productVariant.repository.js';
import { InventoryRepository } from '../repositories/inventory.repository.js';
import { InventoryService } from './inventory.service.js';
import { CartService } from './cart.service.js';
import { Product } from '../models/product.model.js';
import { ProductVariant } from '../models/productVariant.model.js';
import { CheckoutSession } from '../models/checkoutSession.model.js';
import { Order } from '../models/order.model.js';
import { Coupon } from '../models/coupon.model.js';
import { CouponUsage } from '../models/couponUsage.model.js';
import { ApiError } from '../utils/ApiError.js';
import { Roles } from '../constants/roles.js';
import { CouponService } from './coupon.service.js';
import { CouponRepository } from '../repositories/coupon.repository.js';
import { CouponUsageRepository } from '../repositories/couponUsage.repository.js';

async function adjustAndSyncStock(variantId, productId, amount, session = null) {
  const inventory = await InventoryRepository.adjustStockAtomic(variantId, amount, session);
  if (!inventory) return null;
  
  await ProductVariantRepository.updateById(variantId, { stockQuantity: inventory.available }, session);
  await InventoryService.syncParentProductStock(productId, session);
  return inventory;
}

export const OrderService = {
  createOrderFromCheckout: async (userId, userRole, { checkoutSessionId }) => {
    if (userRole !== Roles.CUSTOMER) {
      throw new ApiError(403, 'Only customers can place orders.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    const createdOrders = [];
    try {
      // 1. Fetch active checkout session and enforce customer ownership
      const checkoutSession = await CheckoutSession.findOne({
        _id: checkoutSessionId,
      }).session(session);

      if (!checkoutSession) {
        throw new ApiError(404, 'Checkout session not found.');
      }
      if (String(checkoutSession.user) !== String(userId)) {
        throw new ApiError(403, 'Unauthorized access to this checkout session.');
      }

      // 2. Validate coupon eligibility
      let couponDoc = null;
      let eligibleItemsSnapshot = [];
      if (checkoutSession.appliedCoupon) {
        couponDoc = await Coupon.findOne({
          _id: checkoutSession.appliedCoupon,
          deletedAt: null,
        }).session(session);

        if (!couponDoc) {
          throw new ApiError(400, 'The coupon applied to this checkout session is no longer available.');
        }

        const validation = await CouponService.validateCouponEligibility(couponDoc, userId, checkoutSession.items, session);
        const discount = CouponService.calculateDiscount(couponDoc, validation.eligibleSubtotal);
        eligibleItemsSnapshot = CouponService.allocateDiscountProportionally(
          discount,
          validation.eligibleItems,
          validation.eligibleSubtotal
        );
      }

      // 3. Perform atomic status transition to block double conversion requests
      const completedSession = await CheckoutSession.findOneAndUpdate(
        { _id: checkoutSessionId, status: 'active' },
        { $set: { status: 'completed' } },
        { new: true, session }
      );
      if (!completedSession) {
        throw new ApiError(400, 'Checkout session is not active or has already been completed.');
      }

      // 4. Retrieve products/variants and group items by seller
      const itemsBySeller = {};
      for (const item of completedSession.items) {
        const product = await Product.findById(item.product).populate('store').session(session);
        const variant = await ProductVariant.findById(item.variant).session(session);

        if (!product || !variant) {
          throw new ApiError(404, `Product or variant not found for item.`);
        }

        const sellerId = String(product.store.owner);
        if (!itemsBySeller[sellerId]) {
          itemsBySeller[sellerId] = [];
        }

        let discountAllocated = 0;
        if (couponDoc) {
          const matchedEligible = eligibleItemsSnapshot.find(
            (el) =>
              String(el.product) === String(item.product) &&
              String(el.variant) === String(item.variant)
          );
          if (matchedEligible) {
            discountAllocated = matchedEligible.discountAllocated;
          }
        }

        const netTotal = Math.max(0, Math.round((item.priceSnapshot * item.quantity - discountAllocated) * 100) / 100);

        itemsBySeller[sellerId].push({
          product: item.product,
          variant: item.variant,
          quantity: item.quantity,
          price: item.priceSnapshot,
          discountAllocated,
          netTotal,
          productTitle: product.title,
          variantSku: variant.sku,
          variantAttributes: variant.attributes,
        });
      }

      // 5. Create distinct orders per seller
      for (const sellerId of Object.keys(itemsBySeller)) {
        let subtotal = 0;
        let orderDiscount = 0;
        for (const item of itemsBySeller[sellerId]) {
          subtotal += item.price * item.quantity;
          orderDiscount += item.discountAllocated;
        }

        const orderTotal = Math.max(0, Math.round((subtotal - orderDiscount) * 100) / 100);
        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        let orderCoupon = null;
        if (couponDoc && orderDiscount > 0) {
          orderCoupon = {
            code: couponDoc.code,
            discountType: couponDoc.discountType,
            discountValue: couponDoc.discountValue,
            allocatedDiscount: orderDiscount,
            scope: couponDoc.scope,
            store: couponDoc.store,
            isMarketplaceSponsored: couponDoc.scope === 'marketplace',
          };
        }

        const orderPayload = {
          orderNumber,
          customer: userId,
          seller: sellerId,
          checkoutSession: checkoutSessionId,
          items: itemsBySeller[sellerId],
          shippingAddress: completedSession.shippingAddress,
          pricing: {
            subtotal,
            shippingFee: 0,
            tax: 0,
            discount: orderDiscount,
            total: orderTotal,
          },
          status: 'pending',
        };

        if (orderCoupon) {
          orderPayload.coupon = orderCoupon;
        }

        const order = await Order.create([orderPayload], { session });
        createdOrders.push(order[0]);
      }

      // 6. Quota updates and validation inside transaction
      if (couponDoc) {
        const updated = await Coupon.findOneAndUpdate(
          {
            _id: couponDoc._id,
            isActive: true,
            deletedAt: null,
            $or: [
              { usageLimit: 0 },
              { $expr: { $lt: ['$usageCount', '$usageLimit'] } },
            ],
          },
          { $inc: { usageCount: 1 } },
          { new: true, session }
        );
        if (!updated) {
          throw new ApiError(400, 'The coupon has reached its usage limit.');
        }

        for (const order of createdOrders) {
          if (order.coupon) {
            await CouponUsage.create([{
              coupon: couponDoc._id,
              user: userId,
              order: order._id,
              checkoutSession: checkoutSessionId,
            }], { session });
          }
        }

        // Count distinct checkoutSessions where user used the coupon
        const usageSessions = await CouponUsage.distinct('checkoutSession', {
          coupon: couponDoc._id,
          user: userId,
        }).session(session);

        if (usageSessions.length > couponDoc.perUserLimit) {
          throw new ApiError(400, 'You have reached the maximum usage limit for this coupon.');
        }
      }

      await session.commitTransaction();
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }

    // 7. Clear cart upon successful transaction
    await CartService.clearCart(userId, userRole);

    return createdOrders;
  },

  getOrderById: async (orderId, userId, userRole) => {
    const order = await OrderRepository.findById(orderId);
    if (!order) {
      throw new ApiError(404, 'Order not found.');
    }

    // Enforce role-based view ownership
    if (userRole === Roles.CUSTOMER && String(order.customer) !== String(userId)) {
      throw new ApiError(403, 'Unauthorized access to this order.');
    }
    if (userRole === Roles.SELLER && String(order.seller) !== String(userId)) {
      throw new ApiError(403, 'Unauthorized access to this order.');
    }

    return order;
  },

  listOrders: async (userId, userRole) => {
    if (userRole === Roles.CUSTOMER) {
      return OrderRepository.findByCustomerId(userId);
    }
    if (userRole === Roles.SELLER) {
      return OrderRepository.findBySellerId(userId);
    }
    if (userRole === Roles.SUPER_ADMIN) {
      return Order.find().sort({ createdAt: -1 });
    }
    throw new ApiError(403, 'Unauthorized access.');
  },

  cancelOrder: async (orderId, userId, userRole, { cancelReason }) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Fetch order inside the session transaction
      const order = await Order.findById(orderId).session(session);
      if (!order) {
        throw new ApiError(404, 'Order not found.');
      }

      // 2. Enforce role access constraints
      if (userRole === Roles.CUSTOMER) {
        if (String(order.customer) !== String(userId)) {
          throw new ApiError(403, 'Unauthorized access.');
        }
        if (!['pending', 'confirmed'].includes(order.status)) {
          throw new ApiError(400, 'Customers can only cancel orders that are pending or confirmed.');
        }
      } else if (userRole === Roles.SELLER) {
        if (String(order.seller) !== String(userId)) {
          throw new ApiError(403, 'Unauthorized access.');
        }
        if (!['pending', 'confirmed', 'processing'].includes(order.status)) {
          throw new ApiError(400, 'Sellers cannot cancel orders once shipped or delivered.');
        }
      } else if (userRole === Roles.SUPER_ADMIN) {
        if (!['pending', 'confirmed', 'processing'].includes(order.status)) {
          throw new ApiError(400, 'Orders cannot be cancelled once shipped or delivered.');
        }
      }

      // 3. Perform atomic status transition to block concurrent cancellation requests
      const allowedStatuses = ['pending', 'confirmed', 'processing'];
      const updatedOrder = await Order.findOneAndUpdate(
        {
          _id: orderId,
          status: { $in: allowedStatuses },
        },
        {
          $set: {
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelledBy: userId,
            cancelReason: cancelReason || '',
          },
        },
        { new: true, session }
      );

      if (!updatedOrder) {
        throw new ApiError(400, 'Order is already cancelled or has updated tracking status.');
      }

      // 4. Revert coupon usage if this was the last active order of the checkout session
      if (order.coupon) {
        const activeOrdersCount = await Order.countDocuments({
          checkoutSession: order.checkoutSession,
          _id: { $ne: order._id },
          status: { $ne: 'cancelled' },
        }).session(session);

        const couponDoc = await Coupon.findOne({ code: order.coupon.code, deletedAt: null }).session(session);
        if (couponDoc) {
          // Delete usage log inside the session
          await CouponUsage.deleteOne({
            coupon: couponDoc._id,
            user: order.customer,
            order: order._id,
          }).session(session);

          if (activeOrdersCount === 0) {
            const updatedCoupon = await Coupon.findOneAndUpdate(
              { _id: couponDoc._id },
              { $inc: { usageCount: -1 } },
              { new: true, session }
            );
            if (!updatedCoupon) {
              throw new ApiError(500, 'Failed to update coupon usage count.');
            }
          }
        }
      }

      // 5. Restore inventory/stock hold atomically inside transaction
      for (const item of order.items) {
        await adjustAndSyncStock(item.variant, item.product, item.quantity, session);
      }

      await session.commitTransaction();
      
      const finalOrder = await Order.findById(orderId);
      return finalOrder;

    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },
};
