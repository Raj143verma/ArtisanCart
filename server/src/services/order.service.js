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
import { ApiError } from '../utils/ApiError.js';
import { Roles } from '../constants/roles.js';

async function adjustAndSyncStock(variantId, productId, amount) {
  const inventory = await InventoryRepository.adjustStockAtomic(variantId, amount);
  if (!inventory) return null;
  
  await ProductVariantRepository.updateById(variantId, { stockQuantity: inventory.available });
  await InventoryService.syncParentProductStock(productId);
  return inventory;
}

export const OrderService = {
  createOrderFromCheckout: async (userId, userRole, { checkoutSessionId }) => {
    if (userRole !== Roles.CUSTOMER) {
      throw new ApiError(403, 'Only customers can place orders.');
    }

    // 1. Fetch active checkout session and enforce customer ownership
    const session = await CheckoutSessionRepository.findById(checkoutSessionId);
    if (!session) {
      throw new ApiError(404, 'Checkout session not found.');
    }
    if (String(session.user) !== String(userId)) {
      throw new ApiError(403, 'Unauthorized access to this checkout session.');
    }

    // 2. Perform atomic status transition to block double conversion requests
    const completedSession = await CheckoutSessionRepository.updateStatusAtomic(checkoutSessionId, 'active', 'completed');
    if (!completedSession) {
      throw new ApiError(400, 'Checkout session is not active or has already been completed.');
    }

    // 3. Retrieve products/variants and group items by seller
    const itemsBySeller = {};
    try {
      for (const item of completedSession.items) {
        const product = await Product.findById(item.product).populate('store');
        const variant = await ProductVariant.findById(item.variant);

        if (!product || !variant) {
          throw new ApiError(404, `Product or variant not found for item.`);
        }

        const sellerId = String(product.store.owner);
        if (!itemsBySeller[sellerId]) {
          itemsBySeller[sellerId] = [];
        }

        itemsBySeller[sellerId].push({
          product: item.product,
          variant: item.variant,
          quantity: item.quantity,
          price: item.priceSnapshot,
          productTitle: product.title,
          variantSku: variant.sku,
          variantAttributes: variant.attributes,
        });
      }
    } catch (err) {
      // Revert checkout status to active and re-throw
      await CheckoutSession.findByIdAndUpdate(checkoutSessionId, { status: 'active' });
      throw err;
    }

    // 4. Create distinct orders per seller
    const createdOrders = [];
    try {
      for (const sellerId of Object.keys(itemsBySeller)) {
        let subtotal = 0;
        for (const item of itemsBySeller[sellerId]) {
          subtotal += item.price * item.quantity;
        }

        const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        const order = await OrderRepository.create({
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
            total: subtotal,
          },
          status: 'pending',
        });
        createdOrders.push(order);
      }
    } catch (err) {
      // Rollback: delete created orders, revert checkout session back to active, and re-throw
      for (const order of createdOrders) {
        await Order.findByIdAndDelete(order._id);
      }
      await CheckoutSession.findByIdAndUpdate(checkoutSessionId, { status: 'active' });
      throw err;
    }

    // 5. Clear the customer's shopping cart upon successful creation
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
    const order = await OrderRepository.findById(orderId);
    if (!order) {
      throw new ApiError(404, 'Order not found.');
    }

    // 1. Enforce role access constraints
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

    // 2. Perform atomic status transition to block concurrent cancellation requests
    const allowedStatuses = ['pending', 'confirmed', 'processing'];
    const updatedOrder = await OrderRepository.updateStatusAtomic(
      orderId,
      allowedStatuses,
      'cancelled',
      {
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancelReason: cancelReason || '',
      }
    );

    if (!updatedOrder) {
      throw new ApiError(400, 'Order is already cancelled or has updated tracking status.');
    }

    // 3. Restore inventory/stock hold atomically
    for (const item of order.items) {
      await adjustAndSyncStock(item.variant, item.product, item.quantity);
    }

    return OrderRepository.findById(orderId);
  },
};
