import mongoose from 'mongoose';
import { StoreBalance } from '../models/storeBalance.model.js';
import { EarningsLedger } from '../models/earningsLedger.model.js';
import { PayoutRequest } from '../models/payoutRequest.model.js';
import { Store } from '../models/store.model.js';
import { Order } from '../models/order.model.js';
import { ApiError } from '../utils/ApiError.js';
import { Roles } from '../constants/roles.js';
import { NotificationService } from './notification.service.js';
import { StoreKYC } from '../models/storeKYC.model.js';

// Helper to generate transaction numbers
const generateLedgerNumber = () => `LDG-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
const generatePayoutNumber = () => `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

export const PayoutService = {
  // Ensure store balance document exists
  getOrCreateStoreBalance: async (storeId, session = null) => {
    let balance = await StoreBalance.findOne({ store: storeId }).session(session);
    if (!balance) {
      balance = new StoreBalance({
        store: storeId,
        availableBalance: 0,
        pendingBalance: 0,
        withdrawnTotal: 0,
      });
      await balance.save({ session });
    }
    return balance;
  },

  // 1. Record pending sale when order is paid & confirmed
  recordPendingSale: async (orderId, session = null) => {
    let passedSession = session;
    let localSession = null;
    if (!passedSession) {
      localSession = await mongoose.startSession();
      localSession.startTransaction();
      passedSession = localSession;
    }

    try {
      const order = await Order.findById(orderId).session(passedSession);
      if (!order) throw new ApiError(404, 'Order not found.');

      const store = await Store.findOne({ owner: order.seller, deletedAt: null }).session(passedSession);
      if (!store) throw new ApiError(404, 'Store not found for seller.');

      // Check if pending sale was already recorded to guarantee idempotency
      const existingLedger = await EarningsLedger.findOne({
        order: order._id,
        transactionType: 'sale_pending',
      }).session(passedSession);

      if (existingLedger) {
        if (localSession) {
          await localSession.commitTransaction();
        }
        return;
      }

      const balance = await PayoutService.getOrCreateStoreBalance(store._id, passedSession);

      balance.pendingBalance = Math.round((balance.pendingBalance + order.pricing.total) * 100) / 100;
      await balance.save({ session: passedSession });

      await EarningsLedger.create(
        [
          {
            ledgerNumber: generateLedgerNumber(),
            store: store._id,
            order: order._id,
            transactionType: 'sale_pending',
            amount: order.pricing.total,
            availableBalanceSnapshot: balance.availableBalance,
            pendingBalanceSnapshot: balance.pendingBalance,
            description: `Pending funds recorded for order #${order.orderNumber}`,
            recordedBy: order.customer,
          },
        ],
        { session: passedSession }
      );

      if (localSession) {
        await localSession.commitTransaction();
      }
    } catch (err) {
      if (localSession) {
        await localSession.abortTransaction();
      }
      throw err;
    } finally {
      if (localSession) {
        localSession.endSession();
      }
    }
  },

  // 2. Clear sale when order is delivered, deduct commission and release to available
  clearSale: async (orderId, session = null) => {
    let passedSession = session;
    let localSession = null;
    if (!passedSession) {
      localSession = await mongoose.startSession();
      localSession.startTransaction();
      passedSession = localSession;
    }

    try {
      const order = await Order.findById(orderId).session(passedSession);
      if (!order) throw new ApiError(404, 'Order not found.');

      const store = await Store.findOne({ owner: order.seller, deletedAt: null }).session(passedSession);
      if (!store) throw new ApiError(404, 'Store not found for seller.');

      // Check if clearance was already recorded to guarantee idempotency
      const existingLedger = await EarningsLedger.findOne({
        order: order._id,
        transactionType: 'sale_cleared',
      }).session(passedSession);

      if (existingLedger) {
        if (localSession) {
          await localSession.commitTransaction();
        }
        return;
      }

      const balance = await PayoutService.getOrCreateStoreBalance(store._id, passedSession);

      const commission = Math.round(order.pricing.subtotal * 0.1 * 100) / 100;
      const netEarnings = Math.max(0, Math.round((order.pricing.total - commission) * 100) / 100);

      balance.pendingBalance = Math.max(0, Math.round((balance.pendingBalance - order.pricing.total) * 100) / 100);
      balance.availableBalance = Math.round((balance.availableBalance + netEarnings) * 100) / 100;
      await balance.save({ session: passedSession });

      await EarningsLedger.create(
        [
          {
            ledgerNumber: generateLedgerNumber(),
            store: store._id,
            order: order._id,
            transactionType: 'sale_cleared',
            amount: order.pricing.total,
            availableBalanceSnapshot: balance.availableBalance,
            pendingBalanceSnapshot: balance.pendingBalance,
            description: `Cleared funds released from pending for order #${order.orderNumber}`,
            recordedBy: order.seller,
          },
        ],
        { session: passedSession }
      );

      await EarningsLedger.create(
        [
          {
            ledgerNumber: generateLedgerNumber(),
            store: store._id,
            order: order._id,
            transactionType: 'commission',
            amount: -commission,
            availableBalanceSnapshot: balance.availableBalance,
            pendingBalanceSnapshot: balance.pendingBalance,
            description: `Platform marketplace commission charged for order #${order.orderNumber}`,
            recordedBy: order.seller,
          },
        ],
        { session: passedSession }
      );

      if (localSession) {
        await localSession.commitTransaction();
      }
    } catch (err) {
      if (localSession) {
        await localSession.abortTransaction();
      }
      throw err;
    } finally {
      if (localSession) {
        localSession.endSession();
      }
    }
  },

  // 2b. Revert pending sale when order is cancelled
  reversePendingSale: async (orderId, session = null) => {
    let passedSession = session;
    let localSession = null;
    if (!passedSession) {
      localSession = await mongoose.startSession();
      localSession.startTransaction();
      passedSession = localSession;
    }

    try {
      const order = await Order.findById(orderId).session(passedSession);
      if (!order) throw new ApiError(404, 'Order not found.');

      const store = await Store.findOne({ owner: order.seller, deletedAt: null }).session(passedSession);
      if (!store) throw new ApiError(404, 'Store not found for seller.');

      // Check if pending sale was recorded
      const pendingLedger = await EarningsLedger.findOne({
        order: order._id,
        transactionType: 'sale_pending',
      }).session(passedSession);

      if (!pendingLedger) {
        // If no pending sale was recorded (e.g. order cancelled before payment), return (idempotent success)
        if (localSession) {
          await localSession.commitTransaction();
        }
        return;
      }

      // Check if reversal was already recorded to prevent duplicate execution
      const existingReversal = await EarningsLedger.findOne({
        order: order._id,
        transactionType: 'adjustment',
        description: { $regex: 'Reversal' },
      }).session(passedSession);

      if (existingReversal) {
        if (localSession) {
          await localSession.commitTransaction();
        }
        return;
      }

      const balance = await PayoutService.getOrCreateStoreBalance(store._id, passedSession);

      // Decrement pending balance
      balance.pendingBalance = Math.max(0, Math.round((balance.pendingBalance - order.pricing.total) * 100) / 100);
      await balance.save({ session: passedSession });

      // Ledger: Adjustment reversal
      await EarningsLedger.create(
        [
          {
            ledgerNumber: generateLedgerNumber(),
            store: store._id,
            order: order._id,
            transactionType: 'adjustment',
            amount: -order.pricing.total,
            availableBalanceSnapshot: balance.availableBalance,
            pendingBalanceSnapshot: balance.pendingBalance,
            description: `Reversal of pending funds due to cancellation of order #${order.orderNumber}`,
            recordedBy: order.seller,
          },
        ],
        { session: passedSession }
      );

      if (localSession) {
        await localSession.commitTransaction();
      }
    } catch (err) {
      if (localSession) {
        await localSession.abortTransaction();
      }
      throw err;
    } finally {
      if (localSession) {
        localSession.endSession();
      }
    }
  },

  // 3. Request Payout (Seller triggers)
  requestPayout: async (sellerId, amount, idempotencyKey) => {
    const store = await Store.findOne({ owner: sellerId, deletedAt: null });
    if (!store) throw new ApiError(404, 'Store not found.');

    // Enforce idempotency: check outside the transaction first to return existingPayout
    const existingPayout = await PayoutRequest.findOne({ idempotencyKey });
    if (existingPayout) {
      return existingPayout;
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Re-verify inside transaction to avoid race condition double locks
      const existingPayoutInTx = await PayoutRequest.findOne({ idempotencyKey }).session(session);
      if (existingPayoutInTx) {
        await session.commitTransaction();
        return existingPayoutInTx;
      }

      // Verify KYC is complete and verified
      const kyc = await StoreKYC.findOne({ store: store._id }).session(session);
      if (!kyc || kyc.verificationStatus !== 'verified') {
        throw new ApiError(400, 'Your store is not KYC verified. Payouts are blocked.');
      }

      const balance = await PayoutService.getOrCreateStoreBalance(store._id, session);

      if (balance.availableBalance < amount) {
        throw new ApiError(400, `Insufficient cleared balance. Available: $${balance.availableBalance}`);
      }

      // Deduct payout amount from available balance
      balance.availableBalance = Math.round((balance.availableBalance - amount) * 100) / 100;
      await balance.save({ session });

      // Create payout request
      const payout = await PayoutRequest.create(
        [
          {
            payoutNumber: generatePayoutNumber(),
            store: store._id,
            seller: sellerId,
            amount,
            status: 'requested',
            idempotencyKey,
          },
        ],
        { session }
      );

      // Ledger: payout hold
      await EarningsLedger.create(
        [
          {
            ledgerNumber: generateLedgerNumber(),
            store: store._id,
            transactionType: 'payout_hold',
            amount: -amount,
            availableBalanceSnapshot: balance.availableBalance,
            pendingBalanceSnapshot: balance.pendingBalance,
            description: `Payout requested and funds locked. request #${payout[0].payoutNumber}`,
            recordedBy: sellerId,
          },
        ],
        { session }
      );

      await session.commitTransaction();
      return payout[0];
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },

  // 4. Process Payout (Admin approves or rejects)
  processPayout: async (adminId, adminRole, payoutId, { status, rejectionReason }) => {
    if (adminRole !== Roles.SUPER_ADMIN) {
      throw new ApiError(403, 'Only super administrators can process payouts.');
    }

    if (!['completed', 'rejected'].includes(status)) {
      throw new ApiError(400, 'Invalid target payout status.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const payout = await PayoutRequest.findById(payoutId).session(session);
      if (!payout) throw new ApiError(404, 'Payout request not found.');

      if (payout.status !== 'requested' && payout.status !== 'processing') {
        throw new ApiError(400, `Payout is already processed in state: ${payout.status}`);
      }

      const balance = await PayoutService.getOrCreateStoreBalance(payout.store, session);

      if (status === 'completed') {
        payout.status = 'completed';
        payout.processedAt = new Date();
        payout.processedBy = adminId;
        await payout.save({ session });

        balance.withdrawnTotal = Math.round((balance.withdrawnTotal + payout.amount) * 100) / 100;
        await balance.save({ session });

        // Ledger: payout complete
        await EarningsLedger.create(
          [
            {
              ledgerNumber: generateLedgerNumber(),
              store: payout.store,
              transactionType: 'payout_complete',
              amount: 0, // 0 amount offset as availableBalance was already decreased during request hold
              availableBalanceSnapshot: balance.availableBalance,
              pendingBalanceSnapshot: balance.pendingBalance,
              description: `Payout completed successfully. request #${payout.payoutNumber}`,
              recordedBy: adminId,
            },
          ],
          { session }
        );

        // Notify Seller
        await NotificationService.sendNotification(payout.seller, {
          type: 'system',
          title: 'Payout Completed',
          message: `Your payout request #${payout.payoutNumber} for $${payout.amount} has been approved and processed!`,
          metadata: { payoutId: payout._id },
        }, session);

      } else if (status === 'rejected') {
        if (!rejectionReason) throw new ApiError(400, 'Rejection reason is required.');

        payout.status = 'rejected';
        payout.rejectionReason = rejectionReason;
        payout.processedAt = new Date();
        payout.processedBy = adminId;
        await payout.save({ session });

        // Refund locked availableBalance
        balance.availableBalance = Math.round((balance.availableBalance + payout.amount) * 100) / 100;
        await balance.save({ session });

        // Ledger: payout refund
        await EarningsLedger.create(
          [
            {
              ledgerNumber: generateLedgerNumber(),
              store: payout.store,
              transactionType: 'payout_refund',
              amount: payout.amount,
              availableBalanceSnapshot: balance.availableBalance,
              pendingBalanceSnapshot: balance.pendingBalance,
              description: `Payout request #${payout.payoutNumber} was rejected: ${rejectionReason}. Funds refunded.`,
              recordedBy: adminId,
            },
          ],
          { session }
        );

        // Notify Seller
        await NotificationService.sendNotification(payout.seller, {
          type: 'system',
          title: 'Payout Rejected',
          message: `Your payout request #${payout.payoutNumber} for $${payout.amount} was rejected. Reason: ${rejectionReason}`,
          metadata: { payoutId: payout._id },
        }, session);
      }

      await session.commitTransaction();
      return payout;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },

  // 5. Retrieve balance
  getStoreBalance: async (userId, userRole, storeId = null) => {
    if (userRole === Roles.SUPER_ADMIN) {
      if (!storeId) throw new ApiError(400, 'storeId is required for administrators.');
      return PayoutService.getOrCreateStoreBalance(storeId);
    }

    if (userRole === Roles.SELLER) {
      const store = await Store.findOne({ owner: userId, deletedAt: null });
      if (!store) throw new ApiError(404, 'Store not found.');
      return PayoutService.getOrCreateStoreBalance(store._id);
    }

    throw new ApiError(403, 'Unauthorized access.');
  },

  // 6. Retrieve ledger history
  getLedgerHistory: async (userId, userRole, { limit = 20, skip = 0, storeId = null }) => {
    let queryStoreId;

    if (userRole === Roles.SUPER_ADMIN) {
      if (!storeId) throw new ApiError(400, 'storeId is required.');
      queryStoreId = storeId;
    } else if (userRole === Roles.SELLER) {
      const store = await Store.findOne({ owner: userId, deletedAt: null });
      if (!store) throw new ApiError(404, 'Store not found.');
      queryStoreId = store._id;
    } else {
      throw new ApiError(403, 'Unauthorized access.');
    }

    const ledger = await EarningsLedger.find({ store: queryStoreId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await EarningsLedger.countDocuments({ store: queryStoreId });

    return { ledger, total };
  },
};
