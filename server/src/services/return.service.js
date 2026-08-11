import mongoose from 'mongoose';
import { ReturnRequest } from '../models/returnRequest.model.js';
import { ReturnRequestRepository } from '../repositories/returnRequest.repository.js';
import { RefundTransactionRepository } from '../repositories/refundTransaction.repository.js';
import { InventoryRepository } from '../repositories/inventory.repository.js';
import { ProductVariantRepository } from '../repositories/productVariant.repository.js';
import { StoreBalance } from '../models/storeBalance.model.js';
import { EarningsLedger } from '../models/earningsLedger.model.js';
import { Order } from '../models/order.model.js';
import { Store } from '../models/store.model.js';
import { Transaction } from '../models/transaction.model.js';
import { Payment } from '../models/payment.model.js';
import { PayoutService } from './payout.service.js';
import { InventoryService } from './inventory.service.js';
import { NotificationService } from './notification.service.js';
import { AuditLogService } from './auditLog.service.js';
import { ApiError } from '../utils/ApiError.js';
import { Roles } from '../constants/roles.js';

const generateReturnNumber = () => `RET-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
const generateRefundNumber = () => `REF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
const generateLedgerNumber = () => `LDG-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

export const ReturnService = {
  // 1. Request Return (Customer)
  requestReturn: async (customerId, { orderId, items }) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const order = await Order.findById(orderId).session(session);
      if (!order) throw new ApiError(404, 'Order not found.');

      if (String(order.customer) !== String(customerId)) {
        throw new ApiError(403, 'Unauthorized access to this order.');
      }

      if (order.status !== 'delivered') {
        throw new ApiError(400, 'Returns can only be requested on delivered orders.');
      }

      // Check if custom order
      if (order.customOrder) {
        throw new ApiError(400, 'Custom orders are bespoke creations and are not eligible for returns.');
      }

      // Gated: Return request window must be within 14 days of delivery
      const deliveredAt = order.shipmentDetails?.deliveredAt;
      if (!deliveredAt) {
        throw new ApiError(400, 'Order delivery timestamp is missing.');
      }
      const daysSinceDelivery = (Date.now() - new Date(deliveredAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDelivery > 14) {
        throw new ApiError(400, 'Return requests are restricted to 14 days post-delivery.');
      }

      // Fetch all active/non-rejected return requests for this order to enforce cumulative quantity checks
      const existingRequests = await ReturnRequest.find({
        order: order._id,
        status: { $ne: 'rejected' },
      }).session(session);

      const skuReturnedQty = {};
      for (const req of existingRequests) {
        for (const item of req.items) {
          skuReturnedQty[item.variantSku] = (skuReturnedQty[item.variantSku] || 0) + item.quantity;
        }
      }

      // Verify items and calculate refund amount
      const requestItems = [];
      let refundAmount = 0;

      for (const returnItem of items) {
        const orderItem = order.items.find(
          (it) => String(it.product) === String(returnItem.product) && it.variantSku === returnItem.variantSku
        );
        if (!orderItem) {
          throw new ApiError(400, `Item ${returnItem.variantSku} is not part of this order.`);
        }

        const alreadyReturned = skuReturnedQty[returnItem.variantSku] || 0;
        if (alreadyReturned + returnItem.quantity > orderItem.quantity) {
          throw new ApiError(
            400,
            `Return quantity exceeds eligible quantity. Ordered: ${orderItem.quantity}, Already Returned/Requested: ${alreadyReturned}, Requested Now: ${returnItem.quantity}`
          );
        }

        // Calculate refund amount based on net total allocated for this item
        const itemUnitRefund = orderItem.netTotal / orderItem.quantity;
        const itemRefundAmount = Math.round(itemUnitRefund * returnItem.quantity * 100) / 100;
        refundAmount = Math.round((refundAmount + itemRefundAmount) * 100) / 100;

        requestItems.push({
          product: returnItem.product,
          variantSku: returnItem.variantSku,
          quantity: returnItem.quantity,
          reason: returnItem.reason,
          condition: returnItem.condition,
        });
      }

      const store = await Store.findOne({ owner: order.seller, deletedAt: null }).session(session);
      if (!store) {
        throw new ApiError(404, 'Seller store not found.');
      }

      const returnRequest = await ReturnRequestRepository.create({
        returnNumber: generateReturnNumber(),
        order: order._id,
        customer: customerId,
        store: store._id,
        items: requestItems,
        refundAmount,
        status: 'requested',
      }, session);

      // Notify seller
      await NotificationService.sendNotification(order.seller, {
        type: 'order',
        title: 'Return Request Received',
        message: `A customer has requested a return for order #${order.orderNumber}.`,
        metadata: { returnId: returnRequest._id, orderId: order._id },
      }, session);

      await session.commitTransaction();
      return returnRequest;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },

  // 2. Approve Return (Seller)
  approveReturn: async (sellerId, returnId, { carrier, trackingNumber, trackingUrl, sellerNotes }) => {
    const returnRequest = await ReturnRequestRepository.findById(returnId);
    if (!returnRequest) throw new ApiError(404, 'Return request not found.');

    const store = await Store.findOne({ owner: sellerId, deletedAt: null });
    if (!store || String(returnRequest.store) !== String(store._id)) {
      throw new ApiError(403, 'Unauthorized access to this return request.');
    }

    const updated = await ReturnRequestRepository.updateStatusAtomic(
      returnId,
      ['requested'],
      'approved',
      {
        sellerNotes: sellerNotes || '',
        'shippingLabel.carrier': carrier || null,
        'shippingLabel.trackingNumber': trackingNumber || null,
        'shippingLabel.trackingUrl': trackingUrl || null,
      }
    );

    if (!updated) {
      throw new ApiError(400, 'Cannot approve return. Current status is ' + returnRequest.status);
    }

    // Notify customer
    await NotificationService.sendNotification(returnRequest.customer, {
      type: 'order',
      title: 'Return Approved',
      message: `Your return request #${returnRequest.returnNumber} has been approved by the seller.`,
      metadata: { returnId: returnRequest._id },
    });

    return updated;
  },

  // 3. Reject Return (Seller)
  rejectReturn: async (sellerId, returnId, { sellerNotes }) => {
    if (!sellerNotes) throw new ApiError(400, 'Seller notes/rejection reason is required.');

    const returnRequest = await ReturnRequestRepository.findById(returnId);
    if (!returnRequest) throw new ApiError(404, 'Return request not found.');

    const store = await Store.findOne({ owner: sellerId, deletedAt: null });
    if (!store || String(returnRequest.store) !== String(store._id)) {
      throw new ApiError(403, 'Unauthorized access to this return request.');
    }

    const updated = await ReturnRequestRepository.updateStatusAtomic(
      returnId,
      ['requested'],
      'rejected',
      { sellerNotes }
    );

    if (!updated) {
      throw new ApiError(400, 'Cannot reject return. Current status is ' + returnRequest.status);
    }

    // Notify customer
    await NotificationService.sendNotification(returnRequest.customer, {
      type: 'order',
      title: 'Return Rejected',
      message: `Your return request #${returnRequest.returnNumber} was rejected. Reason: ${sellerNotes}`,
      metadata: { returnId: returnRequest._id },
    });

    return updated;
  },

  // 4. Dispute Rejection (Customer)
  disputeRejection: async (customerId, returnId, { disputeReason }) => {
    if (!disputeReason) throw new ApiError(400, 'Dispute explanation is required.');

    const returnRequest = await ReturnRequestRepository.findById(returnId);
    if (!returnRequest) throw new ApiError(404, 'Return request not found.');

    if (String(returnRequest.customer) !== String(customerId)) {
      throw new ApiError(403, 'Unauthorized access to this return request.');
    }

    const updated = await ReturnRequestRepository.updateStatusAtomic(
      returnId,
      ['rejected'],
      'disputed',
      { disputeReason }
    );

    if (!updated) {
      throw new ApiError(400, 'Cannot dispute return. Current status is ' + returnRequest.status);
    }

    return updated;
  },

  // 4b. Ship Return (Customer)
  shipReturn: async (customerId, returnId, { carrier, trackingNumber, trackingUrl }) => {
    const returnRequest = await ReturnRequestRepository.findById(returnId);
    if (!returnRequest) throw new ApiError(404, 'Return request not found.');

    if (String(returnRequest.customer) !== String(customerId)) {
      throw new ApiError(403, 'Unauthorized access to this return request.');
    }

    const updated = await ReturnRequestRepository.updateStatusAtomic(
      returnId,
      ['approved'],
      'shipped',
      {
        'shippingLabel.carrier': carrier,
        'shippingLabel.trackingNumber': trackingNumber,
        'shippingLabel.trackingUrl': trackingUrl || null,
      }
    );

    if (!updated) {
      throw new ApiError(400, 'Cannot ship return. Current status is ' + returnRequest.status);
    }

    // Notify seller
    const store = await Store.findById(returnRequest.store);
    if (store) {
      await NotificationService.sendNotification(store.owner, {
        type: 'order',
        title: 'Return Items Shipped',
        message: `The customer has shipped return items for return #${returnRequest.returnNumber}. Tracking: ${trackingNumber} (${carrier})`,
        metadata: { returnId: returnRequest._id },
      });
    }

    return updated;
  },

  // 5. Resolve Dispute (Admin)
  resolveDispute: async (adminId, adminRole, returnId, { status, rejectionReason }, reqContext = null) => {
    if (adminRole !== Roles.SUPER_ADMIN) {
      throw new ApiError(403, 'Only super administrators can resolve disputes.');
    }

    if (!['approved', 'rejected'].includes(status)) {
      throw new ApiError(400, 'Invalid dispute resolution status.');
    }

    const returnRequest = await ReturnRequestRepository.findById(returnId);
    if (!returnRequest) throw new ApiError(404, 'Return request not found.');

    const before = returnRequest.toObject();

    const updateFields = {
      resolvedAt: new Date(),
      resolvedBy: adminId,
    };

    if (status === 'rejected') {
      if (!rejectionReason) throw new ApiError(400, 'Rejection reason is required.');
      updateFields.sellerNotes = rejectionReason;
    }

    const updated = await ReturnRequestRepository.updateStatusAtomic(
      returnId,
      ['disputed'],
      status,
      updateFields
    );

    if (!updated) {
      throw new ApiError(400, 'Cannot resolve dispute. Current status is ' + returnRequest.status);
    }

    // Notify customer
    await NotificationService.sendNotification(returnRequest.customer, {
      type: 'order',
      title: 'Dispute Resolved',
      message: `The administrator has resolved your dispute for return #${returnRequest.returnNumber} as: ${status}.`,
      metadata: { returnId: returnRequest._id },
    });

    const after = updated.toObject();
    await AuditLogService.logAction(
      reqContext || adminId,
      `dispute.resolve_${status}`,
      'ReturnRequest',
      returnRequest._id,
      { before, after }
    );

    return updated;
  },

  // 6. Receive Return & Trigger Refund (Seller)
  receiveReturn: async (sellerId, returnId) => {
    const returnRequest = await ReturnRequestRepository.findById(returnId);
    if (!returnRequest) throw new ApiError(404, 'Return request not found.');

    const store = await Store.findOne({ owner: sellerId, deletedAt: null });
    if (!store || String(returnRequest.store) !== String(store._id)) {
      throw new ApiError(403, 'Unauthorized access to this return request.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const updated = await ReturnRequestRepository.updateStatusAtomic(
        returnId,
        ['approved', 'shipped'],
        'received',
        {},
        session
      );

      if (!updated) {
        throw new ApiError(400, 'Cannot receive return. Current status is ' + returnRequest.status);
      }

      // Process balance clawback, stock restoral, and mock gateway refund
      await ReturnService.processReturnRefund(returnId, session);

      await session.commitTransaction();
      
      const finalRequest = await ReturnRequestRepository.findById(returnId);
      return finalRequest;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },

  // 7. Transactional Payout clawback, Inventory replenishment, and Gateway Refund creation
  processReturnRefund: async (returnId, session = null) => {
    let passedSession = session;
    let localSession = null;
    if (!passedSession) {
      localSession = await mongoose.startSession();
      localSession.startTransaction();
      passedSession = localSession;
    }

    try {
      const returnRequest = await ReturnRequest.findById(returnId).populate('order').session(passedSession);
      if (!returnRequest) throw new ApiError(404, 'Return request not found.');

      if (returnRequest.status === 'completed') {
        // Already processed, return early (idempotent success)
        if (localSession) await localSession.commitTransaction();
        return;
      }

      if (returnRequest.status !== 'received') {
        throw new ApiError(400, 'Refunds can only be processed for received return items.');
      }

      // Calculate commission reversal: 10% of returned items subtotal (pre-discount)
      let returnedSubtotal = 0;
      for (const item of returnRequest.items) {
        const orderItem = returnRequest.order.items.find(
          (it) => String(it.product) === String(item.product) && it.variantSku === item.variantSku
        );
        if (orderItem) {
          returnedSubtotal += orderItem.price * item.quantity;
        }
      }
      const commissionRefund = Math.round(returnedSubtotal * 0.1 * 100) / 100;
      const netSellerClawback = Math.round((returnRequest.refundAmount - commissionRefund) * 100) / 100;

      // Get or create store balance to ensure record exists
      const balance = await PayoutService.getOrCreateStoreBalance(returnRequest.store, passedSession);
      
      // availableBalance is allowed to go negative
      balance.availableBalance = Math.round((balance.availableBalance - netSellerClawback) * 100) / 100;
      await balance.save({ session: passedSession });

      // Check if an adjustment ledger document already exists for this order
      let adjustmentLedger = await EarningsLedger.findOne({
        order: returnRequest.order._id,
        transactionType: 'adjustment',
      }).session(passedSession);

      if (adjustmentLedger) {
        // Idempotency check: has this return number already been recorded in the adjustment?
        if (adjustmentLedger.description.includes(returnRequest.returnNumber)) {
          // Already processed this return, return early (idempotent success)
          if (localSession) await localSession.commitTransaction();
          return;
        }

        // Update existing adjustment ledger
        adjustmentLedger.amount = Math.round((adjustmentLedger.amount - netSellerClawback) * 100) / 100;
        adjustmentLedger.availableBalanceSnapshot = balance.availableBalance;
        adjustmentLedger.pendingBalanceSnapshot = balance.pendingBalance;
        adjustmentLedger.description += `; Net clawback for return request #${returnRequest.returnNumber} (gross refund clawback: -$${returnRequest.refundAmount}, commission reversal: +$${commissionRefund})`;
        await adjustmentLedger.save({ session: passedSession });
      } else {
        // Create new consolidated adjustment ledger document
        await EarningsLedger.create(
          [
            {
              ledgerNumber: generateLedgerNumber(),
              store: returnRequest.store,
              order: returnRequest.order._id,
              transactionType: 'adjustment',
              amount: -netSellerClawback,
              availableBalanceSnapshot: balance.availableBalance,
              pendingBalanceSnapshot: balance.pendingBalance,
              description: `Net clawback for return request #${returnRequest.returnNumber} (gross refund clawback: -$${returnRequest.refundAmount}, commission reversal: +$${commissionRefund})`,
              recordedBy: returnRequest.order.customer,
            },
          ],
          { session: passedSession }
        );
      }

      // Restock inventory for resellable items (condition is not 'damaged')
      for (const item of returnRequest.items) {
        if (item.condition !== 'damaged') {
          // Resolve standard product reference
          const orderItem = returnRequest.order.items.find(
            (it) => String(it.product) === String(item.product) && it.variantSku === item.variantSku
          );
          if (orderItem && orderItem.variant && orderItem.product) {
            const inv = await InventoryRepository.adjustStockAtomic(
              orderItem.variant,
              item.quantity,
              passedSession
            );
            if (inv) {
              await ProductVariantRepository.updateById(
                orderItem.variant,
                { stockQuantity: inv.available },
                passedSession
              );
              await InventoryService.syncParentProductStock(
                orderItem.product,
                passedSession
              );
            }
          }
        }
      }

      // Update Order Status and paymentStatus
      const order = returnRequest.order;
      const isFullRefund = returnRequest.refundAmount >= order.pricing.total;
      
      order.status = isFullRefund ? 'cancelled' : order.status;
      order.paymentStatus = isFullRefund ? 'refunded' : 'partially_refunded';
      await order.save({ session: passedSession });

      // Update associated Payment model if exists
      const payment = await Payment.findOne({ order: order._id }).session(passedSession);
      if (payment) {
        payment.status = isFullRefund ? 'refunded' : payment.status;
        await payment.save({ session: passedSession });
      }

      // Create RefundTransaction to log gateway simulation
      const originalTx = await Transaction.findOne({ orders: order._id }).session(passedSession);
      if (originalTx) {
        await RefundTransactionRepository.create(
          {
            refundNumber: generateRefundNumber(),
            originalTransaction: originalTx._id,
            order: order._id,
            amount: returnRequest.refundAmount,
            status: 'succeeded',
            providerRefundId: `ref_${Math.random().toString(36).substr(2, 9)}`,
            reason: `Refund for return #${returnRequest.returnNumber}`,
          },
          passedSession
        );
      }

      // Transition return request status to completed
      returnRequest.status = 'completed';
      await returnRequest.save({ session: passedSession });

      // Notify customer
      await NotificationService.sendNotification(returnRequest.customer, {
        type: 'order',
        title: 'Refund Completed',
        message: `Your refund of $${returnRequest.refundAmount} for return #${returnRequest.returnNumber} has been processed.`,
        metadata: { returnId: returnRequest._id },
      }, passedSession);

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
};
