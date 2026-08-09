import mongoose from 'mongoose';
import { TransactionRepository } from '../repositories/transaction.repository.js';
import { OrderRepository } from '../repositories/order.repository.js';
import { MockProvider } from './providers/mock.provider.js';
import { Transaction } from '../models/transaction.model.js';
import { CustomOrder } from '../models/customOrder.model.js';
import { Order } from '../models/order.model.js';
import { Store } from '../models/store.model.js';
import { ApiError } from '../utils/ApiError.js';
import { Roles } from '../constants/roles.js';

export const PaymentService = {
  initializePayment: async (userId, userRole, { orderIds, customOrderId, shippingAddress, idempotencyKey, provider }) => {
    if (userRole !== Roles.CUSTOMER) {
      throw new ApiError(403, 'Only customers can make payments.');
    }

    // 1. Enforce Idempotency to prevent duplicate transaction creations
    const existing = await TransactionRepository.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      if (String(existing.user) !== String(userId)) {
        throw new ApiError(403, 'Idempotency key belongs to another user.');
      }
      if (customOrderId) {
        if (String(existing.customOrder) !== String(customOrderId)) {
          throw new ApiError(400, 'Idempotency key has already been used for another custom order.');
        }
      } else {
        const existingOrderIds = existing.orders.map((o) => String(o._id || o));
        const isMatch =
          existingOrderIds.length === orderIds.length &&
          orderIds.every((id) => existingOrderIds.includes(String(id)));

        if (!isMatch) {
          throw new ApiError(400, 'Idempotency key has already been used for another set of orders.');
        }
      }
      return existing;
    }

    let totalAmount = 0;
    let transactionPayload = {
      user: userId,
      currency: 'USD',
      provider,
      idempotencyKey,
      paymentStatus: 'created',
    };

    if (customOrderId) {
      // 2a. Validate Custom Order quote eligibility and budget
      const customOrder = await CustomOrder.findById(customOrderId);
      if (!customOrder) {
        throw new ApiError(404, 'Custom order not found.');
      }
      if (String(customOrder.user) !== String(userId)) {
        throw new ApiError(403, 'Unauthorized access to this custom order.');
      }
      if (customOrder.status !== 'approved') {
        throw new ApiError(400, 'Only approved custom order quotes can be paid.');
      }
      if (!shippingAddress) {
        throw new ApiError(400, 'Shipping address is required for custom order checkout.');
      }
      totalAmount = customOrder.budget;
      transactionPayload.customOrder = customOrderId;
      transactionPayload.orders = [];
      transactionPayload.metadata = { shippingAddress };
    } else {
      // 2b. Validate Standard Order eligibility and calculate total amount
      if (!orderIds || orderIds.length === 0) {
        throw new ApiError(400, 'At least one order ID is required.');
      }
      const orders = [];
      for (const orderId of orderIds) {
        const order = await OrderRepository.findById(orderId);
        if (!order) {
          throw new ApiError(404, `Order ${orderId} not found.`);
        }
        if (String(order.customer) !== String(userId)) {
          throw new ApiError(403, `Unauthorized access to order ${orderId}.`);
        }
        if (order.status !== 'pending') {
          throw new ApiError(400, `Order ${orderId} cannot be paid. Current status is ${order.status}`);
        }
        orders.push(order);
        totalAmount += order.pricing.total;
      }
      transactionPayload.orders = orderIds;
    }

    // 3. Resolve Provider strategy (only mock supported in Payment Core)
    let providerInstance;
    if (provider === 'mock') {
      providerInstance = new MockProvider();
    } else {
      throw new ApiError(400, 'Unsupported payment provider.');
    }

    // 4. Create local transaction record
    const transactionNumber = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    transactionPayload.transactionNumber = transactionNumber;
    transactionPayload.amount = totalAmount;

    const transaction = await TransactionRepository.create(transactionPayload);

    // 5. Initialize intent session on gateway
    try {
      const { providerSessionId } = await providerInstance.createIntent(transaction._id, totalAmount, 'USD');
      
      const updated = await TransactionRepository.updateById(transaction._id, {
        providerSessionId,
        paymentStatus: 'pending',
      });
      return updated;
    } catch (err) {
      await TransactionRepository.updateById(transaction._id, { paymentStatus: 'failed' });
      throw err;
    }
  },

  getTransaction: async (transactionId, userId, userRole) => {
    const transaction = await TransactionRepository.findById(transactionId);
    if (!transaction) {
      throw new ApiError(404, 'Transaction not found.');
    }

    if (String(transaction.user) !== String(userId) && userRole !== Roles.SUPER_ADMIN) {
      throw new ApiError(403, 'Unauthorized access to this transaction.');
    }

    return transaction;
  },

  listPayments: async (userId, userRole) => {
    if (userRole === Roles.CUSTOMER) {
      return TransactionRepository.findByUserId(userId);
    }
    if (userRole === Roles.SUPER_ADMIN) {
      return Transaction.find().populate({
        path: 'orders',
        select: 'orderNumber status pricing items',
      }).sort({ createdAt: -1 });
    }
    throw new ApiError(403, 'Unauthorized access.');
  },

  verifyPaymentResult: async (providerSessionId, status) => {
    const transaction = await Transaction.findOne({ providerSessionId }).populate('orders');
    if (!transaction) {
      throw new ApiError(404, 'Transaction not found for specified providerSessionId.');
    }

    // Self-healing check: If transaction is already captured, ensure all associated split orders are confirmed
    if (transaction.paymentStatus === 'captured') {
      if (transaction.customOrder) {
        const order = await Order.findOne({ customOrder: transaction.customOrder });
        if (order && order.status === 'pending') {
          await OrderRepository.updateStatusAtomic(
            order._id,
            ['pending'],
            'confirmed',
            { paymentStatus: 'paid' }
          );
        }
      } else {
        for (const order of transaction.orders) {
          if (order.status === 'pending') {
            await OrderRepository.updateStatusAtomic(
              order._id,
              ['pending'],
              'confirmed',
              { paymentStatus: 'paid' }
            );
          }
        }
      }
      return transaction;
    }

    // If transaction already failed, return it directly
    if (transaction.paymentStatus === 'failed') {
      return transaction;
    }

    const targetStatus = status === 'captured' ? 'captured' : 'failed';

    // Perform atomic status transition
    const updatedTx = await TransactionRepository.updateStatusAtomic(
      transaction._id,
      'pending',
      targetStatus
    );

    if (!updatedTx) {
      // Concurrent update resolved it already
      return TransactionRepository.findById(transaction._id);
    }

    // Finalize orders on successful payment
    if (targetStatus === 'captured') {
      if (transaction.customOrder) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const customOrder = await CustomOrder.findById(transaction.customOrder).populate('store').session(session);
          if (customOrder && customOrder.status === 'approved') {
            customOrder.status = 'in_progress';
            await customOrder.save({ session });

            const orderNumber = `ORD-CUSTOM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            const shippingAddress = transaction.metadata?.shippingAddress || {};

            const orderPayload = {
              orderNumber,
              customer: customOrder.user,
              seller: customOrder.store.owner,
              customOrder: customOrder._id,
              items: [{
                quantity: 1,
                price: customOrder.budget,
                discountAllocated: 0,
                netTotal: customOrder.budget,
                productTitle: customOrder.title,
                variantSku: 'CUSTOM-ORDER',
                variantAttributes: {},
              }],
              shippingAddress,
              pricing: {
                subtotal: customOrder.budget,
                shippingFee: 0,
                tax: 0,
                discount: 0,
                total: customOrder.budget,
              },
              status: 'confirmed',
              paymentStatus: 'paid',
            };

            const order = await Order.create([orderPayload], { session });

            await Transaction.updateOne(
              { _id: transaction._id },
              { $set: { orders: [order[0]._id] } },
              { session }
            );
          }
          await session.commitTransaction();
        } catch (err) {
          await session.abortTransaction();
          throw err;
        } finally {
          session.endSession();
        }
      } else {
        for (const order of transaction.orders) {
          await OrderRepository.updateStatusAtomic(
            order._id,
            ['pending'],
            'confirmed',
            { paymentStatus: 'paid' }
          );
        }
      }
    }

    return updatedTx;
  },

  cancelPayment: async (transactionId, userId, userRole) => {
    const transaction = await TransactionRepository.findById(transactionId);
    if (!transaction) {
      throw new ApiError(404, 'Transaction not found.');
    }

    if (String(transaction.user) !== String(userId) && userRole !== Roles.SUPER_ADMIN) {
      throw new ApiError(403, 'Unauthorized access.');
    }

    if (!['created', 'pending'].includes(transaction.paymentStatus)) {
      throw new ApiError(400, `Transaction cannot be cancelled. Current status is ${transaction.paymentStatus}`);
    }

    const updated = await TransactionRepository.updateStatusAtomic(
      transactionId,
      transaction.paymentStatus,
      'cancelled'
    );

    if (!updated) {
      throw new ApiError(400, 'Transaction status transition failed.');
    }

    return updated;
  },
};
