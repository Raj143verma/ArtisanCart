import { CheckoutSessionRepository } from '../repositories/checkoutSession.repository.js';
import { CartRepository } from '../repositories/cart.repository.js';
import { ProductVariantRepository } from '../repositories/productVariant.repository.js';
import { ProductRepository } from '../repositories/product.repository.js';
import { InventoryRepository } from '../repositories/inventory.repository.js';
import { InventoryService } from './inventory.service.js';
import { validateCartItem, getVariantId, getProductId } from './cart.service.js';
import { CheckoutSession } from '../models/checkoutSession.model.js';
import { ApiError } from '../utils/ApiError.js';
import { Roles } from '../constants/roles.js';

async function adjustAndSyncStock(variantId, productId, amount) {
  const inventory = await InventoryRepository.adjustStockAtomic(variantId, amount);
  if (!inventory) return null;
  
  await ProductVariantRepository.updateById(variantId, { stockQuantity: inventory.available });
  await InventoryService.syncParentProductStock(productId);
  return inventory;
}

async function cleanExpiredSessions(userId) {
  const expiredSessions = await CheckoutSession.find({
    user: userId,
    status: 'active',
    expiresAt: { $lt: new Date() },
  });

  for (const session of expiredSessions) {
    // Atomic status update transition
    const updated = await CheckoutSessionRepository.updateStatusAtomic(session._id, 'active', 'expired');
    if (updated) {
      for (const item of session.items) {
        await adjustAndSyncStock(item.variant, item.product, item.quantity);
      }
    }
  }
}

export const CheckoutSessionService = {
  initCheckout: async (userId, userRole, { shippingAddress, billingAddress }) => {
    if (userRole !== Roles.CUSTOMER) {
      throw new ApiError(403, 'Only customers can check out.');
    }

    // 1. Clean up any expired checkouts for this user first to release stock
    await cleanExpiredSessions(userId);

    // 2. Fetch active cart
    const cart = await CartRepository.findByUserId(userId);
    if (!cart || cart.items.length === 0) {
      throw new ApiError(400, 'Your cart is empty.');
    }

    // 3. Cancel any existing active checkout session
    const activeSession = await CheckoutSessionRepository.findActiveByUserId(userId);
    if (activeSession) {
      await CheckoutSessionService.cancelCheckout(activeSession._id, userId, userRole);
    }

    // 4. Validate all cart items & compile pricing/snapshots
    const checkoutItems = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const pId = getProductId(item);
      const vId = getVariantId(item);
      const qty = item.quantity;

      const validation = await validateCartItem(pId, vId, qty);
      if (!validation.isValid || validation.isStockLimited) {
        throw new ApiError(
          400,
          `Cart item validation failed for variant ${vId}. Item may be inactive, unpublished, or stock is insufficient.`
        );
      }

      checkoutItems.push({
        product: pId,
        variant: vId,
        quantity: qty,
        priceSnapshot: validation.variant.price,
      });

      subtotal += validation.variant.price * qty;
    }

    // 5. Reserve available stock atomically (with automatic rollbacks on failure)
    const decrementedItems = [];
    try {
      for (const item of checkoutItems) {
        const updated = await adjustAndSyncStock(item.variant, item.product, -item.quantity);
        if (!updated) {
          throw new ApiError(400, `Stock reservation failed due to insufficient stock.`);
        }
        decrementedItems.push(item);
      }
    } catch (err) {
      // Rollback decremented stock on validation error
      for (const item of decrementedItems) {
        await adjustAndSyncStock(item.variant, item.product, item.quantity);
      }
      throw err;
    }

    // 6. Compile addresses and pricing
    const finalBillingAddress = billingAddress || shippingAddress;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiration

    try {
      const session = await CheckoutSessionRepository.create({
        user: userId,
        cart: cart._id,
        items: checkoutItems,
        shippingAddress,
        billingAddress: finalBillingAddress,
        pricing: {
          subtotal,
          shippingFee: 0,
          tax: 0,
          total: subtotal,
        },
        expiresAt,
      });

      return session;
    } catch (err) {
      // Rollback stock holds if creation fails (e.g. duplicate active session index conflict)
      for (const item of decrementedItems) {
        await adjustAndSyncStock(item.variant, item.product, item.quantity);
      }
      if (err.code === 11000) {
        throw new ApiError(409, 'An active checkout session is already in progress.');
      }
      throw err;
    }
  },

  getCheckout: async (sessionId, userId, userRole) => {
    // Clean expired checkouts for this user
    await cleanExpiredSessions(userId);

    const session = await CheckoutSessionRepository.findById(sessionId);
    if (!session) {
      throw new ApiError(404, 'Checkout session not found.');
    }

    if (String(session.user) !== String(userId) && userRole !== Roles.SUPER_ADMIN) {
      throw new ApiError(403, 'Unauthorized access to this checkout session.');
    }

    return session;
  },

  cancelCheckout: async (sessionId, userId, userRole) => {
    const session = await CheckoutSessionRepository.findById(sessionId);
    if (!session) {
      throw new ApiError(404, 'Checkout session not found.');
    }

    if (String(session.user) !== String(userId) && userRole !== Roles.SUPER_ADMIN) {
      throw new ApiError(403, 'Unauthorized access.');
    }

    // Atomic status transition to block double restoration checks
    const updatedSession = await CheckoutSessionRepository.updateStatusAtomic(sessionId, 'active', 'cancelled');
    if (!updatedSession) {
      throw new ApiError(
        400,
        `Checkout session is not active or already processed. Current status is ${session.status}`
      );
    }

    // Restore stock locks using items from the retrieved session
    for (const item of session.items) {
      const pId = getProductId(item);
      const vId = getVariantId(item);
      await adjustAndSyncStock(vId, pId, item.quantity);
    }

    return CheckoutSessionRepository.findById(sessionId);
  },
};
