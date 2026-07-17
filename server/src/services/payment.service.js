import { TransactionRepository } from '../repositories/transaction.repository.js';
import { OrderRepository } from '../repositories/order.repository.js';
import { MockProvider } from './providers/mock.provider.js';
import { Transaction } from '../models/transaction.model.js';
import { ApiError } from '../utils/ApiError.js';
import { Roles } from '../constants/roles.js';

export const PaymentService = {
  initializePayment: async (userId, userRole, { orderIds, idempotencyKey, provider }) => {
    if (userRole !== Roles.CUSTOMER) {
      throw new ApiError(403, 'Only customers can make payments.');
    }

    // 1. Enforce Idempotency to prevent duplicate transaction creations
    const existing = await TransactionRepository.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      if (String(existing.user) !== String(userId)) {
        throw new ApiError(403, 'Idempotency key belongs to another user.');
      }
      // Verify that the idempotency key maps to the exact same orders
      const existingOrderIds = existing.orders.map((o) => String(o._id || o));
      const isMatch =
        existingOrderIds.length === orderIds.length &&
        orderIds.every((id) => existingOrderIds.includes(String(id)));

      if (!isMatch) {
        throw new ApiError(400, 'Idempotency key has already been used for another set of orders.');
      }

      return existing;
    }

    // 2. Validate Order eligibility and calculate total amount
    const orders = [];
    let totalAmount = 0;
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

    // 3. Resolve Provider strategy (only mock supported in Payment Core)
    let providerInstance;
    if (provider === 'mock') {
      providerInstance = new MockProvider();
    } else {
      throw new ApiError(400, 'Unsupported payment provider.');
    }

    // 4. Create local transaction record
    const transactionNumber = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const transaction = await TransactionRepository.create({
      transactionNumber,
      user: userId,
      orders: orderIds,
      amount: totalAmount,
      currency: 'USD',
      provider,
      idempotencyKey,
      paymentStatus: 'created',
    });

    // 5. Initialize intent session on gateway
    try {
      const { providerSessionId } = await providerInstance.createIntent(transaction._id, totalAmount, 'USD');
      
      const updated = await TransactionRepository.updateById(transaction._id, {
        providerSessionId,
        paymentStatus: 'pending',
      });
      return updated;
    } catch (err) {
      // Revert status to failed if gateway fails
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
      for (const order of transaction.orders) {
        await OrderRepository.updateStatusAtomic(
          order._id,
          ['pending'],
          'confirmed',
          { paymentStatus: 'paid' }
        );
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
