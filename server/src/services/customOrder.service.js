import mongoose from 'mongoose';
import { CustomOrder } from '../models/customOrder.model.js';
import { CustomOrderRepository } from '../repositories/customOrder.repository.js';
import { Store } from '../models/store.model.js';
import { ApiError } from '../utils/ApiError.js';
import { Roles } from '../constants/roles.js';
import { Order } from '../models/order.model.js';
import { NotificationService } from './notification.service.js';
import { PayoutService } from './payout.service.js';

export const CustomOrderService = {
  createRequest: async (userId, payload) => {
    const { storeId, title, description, requestedDeliveryDate, budget, attachments } = payload;

    // 1. Verify store exists and is active/approved
    const store = await Store.findOne({ _id: storeId, status: 'active', deletedAt: null });
    if (!store) {
      throw new ApiError(404, 'The selected store is not active or does not exist.');
    }
    if (!store.isApproved) {
      throw new ApiError(403, 'The selected store is not approved to receive custom orders.');
    }

    // 2. Prevent self-dealing (sellers requesting custom orders from their own store)
    if (String(store.owner) === String(userId)) {
      throw new ApiError(400, 'Sellers cannot request custom orders from their own store.');
    }

    // 3. Create request
    const customOrder = await CustomOrderRepository.create({
      user: userId,
      store: storeId,
      title,
      description,
      requestedDeliveryDate: requestedDeliveryDate ? new Date(requestedDeliveryDate) : null,
      budget: budget || 0,
      attachments: attachments || [],
      status: 'requested',
    });

    await NotificationService.sendNotification(store.owner, {
      type: 'order',
      title: 'New Custom Order Request',
      message: `You have received a new bespoke request: "${title}"`,
      metadata: { customOrderId: customOrder._id },
    });

    return customOrder;
  },

  submitQuote: async (sellerId, customOrderId, budget) => {
    const customOrder = await CustomOrderRepository.findById(customOrderId);
    if (!customOrder) {
      throw new ApiError(404, 'Custom order not found.');
    }

    // Verify status is requested or quoted (allowing updates to the quote)
    if (!['requested', 'quoted'].includes(customOrder.status)) {
      throw new ApiError(400, `Cannot submit quote. Current status is: ${customOrder.status}`);
    }

    // Verify seller owns the store
    const store = await Store.findById(customOrder.store);
    if (!store || String(store.owner) !== String(sellerId)) {
      throw new ApiError(403, 'Unauthorized access to quote this custom order.');
    }

    const updated = await CustomOrderRepository.updateStatusAtomic(
      customOrderId,
      ['requested', 'quoted'],
      'quoted',
      { budget }
    );

    if (!updated) {
      throw new ApiError(400, 'Failed to update quote. The status may have changed.');
    }

    await NotificationService.sendNotification(customOrder.user, {
      type: 'order',
      title: 'Custom Order Quoted',
      message: `The seller has submitted a quote of $${budget} for "${customOrder.title}"`,
      metadata: { customOrderId: customOrder._id },
    });

    return updated;
  },

  approveQuote: async (customerId, customOrderId) => {
    const customOrder = await CustomOrderRepository.findById(customOrderId);
    if (!customOrder) {
      throw new ApiError(404, 'Custom order not found.');
    }

    if (customOrder.status !== 'quoted') {
      throw new ApiError(400, 'Only custom orders that have been quoted can be approved.');
    }

    if (String(customOrder.user) !== String(customerId)) {
      throw new ApiError(403, 'Only the requesting customer can approve the quote.');
    }

    const updated = await CustomOrderRepository.updateStatusAtomic(
      customOrderId,
      ['quoted'],
      'approved'
    );

    if (!updated) {
      throw new ApiError(400, 'Failed to approve quote. The status may have changed.');
    }

    const store = await Store.findById(customOrder.store);
    if (store) {
      await NotificationService.sendNotification(store.owner, {
        type: 'order',
        title: 'Quote Approved',
        message: `The customer has approved your quote for "${customOrder.title}". Waiting for payment.`,
        metadata: { customOrderId: customOrder._id },
      });
    }

    return updated;
  },

  startWork: async (sellerId, customOrderId) => {
    const customOrder = await CustomOrderRepository.findById(customOrderId);
    if (!customOrder) {
      throw new ApiError(404, 'Custom order not found.');
    }

    // Work can only be marked in progress if approved and paid (which transitions status)
    if (customOrder.status !== 'approved' && customOrder.status !== 'in_progress') {
      throw new ApiError(400, 'Cannot start work. Order must be approved first.');
    }

    // Verify seller ownership
    const store = await Store.findById(customOrder.store);
    if (!store || String(store.owner) !== String(sellerId)) {
      throw new ApiError(403, 'Unauthorized access.');
    }

    const updated = await CustomOrderRepository.updateStatusAtomic(
      customOrderId,
      ['approved'],
      'in_progress'
    );

    if (updated) {
      await NotificationService.sendNotification(customOrder.user, {
        type: 'order',
        title: 'Work In Progress',
        message: `The seller has started work on your bespoke item "${customOrder.title}".`,
        metadata: { customOrderId: customOrder._id },
      });
    }

    return updated || customOrder;
  },

  completeWork: async (sellerId, customOrderId) => {
    const customOrder = await CustomOrderRepository.findById(customOrderId);
    if (!customOrder) {
      throw new ApiError(404, 'Custom order not found.');
    }

    if (customOrder.status !== 'in_progress') {
      throw new ApiError(400, 'Only custom orders in progress can be marked completed.');
    }

    // Verify seller ownership
    const store = await Store.findById(customOrder.store);
    if (!store || String(store.owner) !== String(sellerId)) {
      throw new ApiError(403, 'Unauthorized access.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Perform atomic status transition within transaction
      const updated = await CustomOrder.findOneAndUpdate(
        { _id: customOrderId, status: 'in_progress' },
        { $set: { status: 'completed' } },
        { new: true, session }
      );

      if (!updated) {
        throw new ApiError(400, 'Failed to complete custom order.');
      }

      // Also update associated Order status to completed if it exists
      const order = await Order.findOneAndUpdate(
        { customOrder: customOrderId, status: 'confirmed' }, // status check to prevent race conditions
        {
          $set: {
            status: 'delivered',
            'shipmentDetails.deliveredAt': new Date(),
          },
        },
        { new: true, session }
      );

      if (order) {
        await PayoutService.clearSale(order._id, session);
      }

      await NotificationService.sendNotification(customOrder.user, {
        type: 'order',
        title: 'Bespoke Order Completed',
        message: `Your bespoke creation "${customOrder.title}" is complete!`,
        metadata: { customOrderId: customOrder._id },
      }, session);

      await session.commitTransaction();
      return updated;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  },

  cancelCustomOrder: async (userId, userRole, customOrderId, reason) => {
    const customOrder = await CustomOrderRepository.findById(customOrderId);
    if (!customOrder) {
      throw new ApiError(404, 'Custom order not found.');
    }

    if (customOrder.status === 'completed' || customOrder.status === 'cancelled') {
      throw new ApiError(400, `Cannot cancel order in status: ${customOrder.status}`);
    }

    if (userRole === Roles.CUSTOMER) {
      // Customers can only cancel requested or quoted custom orders (before payment/approval)
      if (String(customOrder.user) !== String(userId)) {
        throw new ApiError(403, 'Unauthorized access.');
      }
      if (!['requested', 'quoted'].includes(customOrder.status)) {
        throw new ApiError(400, 'You cannot cancel a custom order once it has been approved.');
      }
    } else if (userRole === Roles.SELLER) {
      // Sellers can reject/cancel at any time before completion
      const store = await Store.findById(customOrder.store);
      if (!store || String(store.owner) !== String(userId)) {
        throw new ApiError(403, 'Unauthorized access.');
      }
    }

    const updated = await CustomOrderRepository.updateStatusAtomic(
      customOrderId,
      ['requested', 'quoted', 'approved', 'in_progress'],
      'cancelled',
      { 'metadata.cancelReason': reason || '' }
    );

    if (!updated) {
      throw new ApiError(400, 'Failed to cancel custom order.');
    }

    // Cancel associated standard order if it was already paid/created
    await Order.findOneAndUpdate(
      { customOrder: customOrderId, status: { $ne: 'cancelled' } },
      { $set: { status: 'cancelled', cancelReason: reason || 'Custom order request cancelled by actor' } }
    );

    const store = await Store.findById(customOrder.store);
    const counterpartId = String(userId) === String(customOrder.user) ? store.owner : customOrder.user;
    await NotificationService.sendNotification(counterpartId, {
      type: 'order',
      title: 'Custom Order Cancelled',
      message: `Bespoke request "${customOrder.title}" has been cancelled.`,
      metadata: { customOrderId: customOrder._id, reason },
    });

    return updated;
  },
};
