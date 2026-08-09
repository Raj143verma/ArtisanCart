import { asyncHandler } from '../utils/asyncHandler.js';
import { createSuccessResponse } from '../helpers/responseHelper.js';
import { CustomOrderService } from '../services/customOrder.service.js';
import { CustomOrderRepository } from '../repositories/customOrder.repository.js';
import { Store } from '../models/store.model.js';
import { ApiError } from '../utils/ApiError.js';
import { Roles } from '../constants/roles.js';

export const createRequest = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const customOrder = await CustomOrderService.createRequest(userId, req.body);
  return res.status(201).json(createSuccessResponse(customOrder, 'Custom order request created successfully.'));
});

export const submitQuote = asyncHandler(async (req, res) => {
  const sellerId = req.user._id;
  const customOrderId = req.params.id;
  const { budget } = req.body;
  const customOrder = await CustomOrderService.submitQuote(sellerId, customOrderId, budget);
  return res.json(createSuccessResponse(customOrder, 'Quote submitted successfully.'));
});

export const approveQuote = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const customOrderId = req.params.id;
  const customOrder = await CustomOrderService.approveQuote(customerId, customOrderId);
  return res.json(createSuccessResponse(customOrder, 'Quote approved successfully.'));
});

export const startWork = asyncHandler(async (req, res) => {
  const sellerId = req.user._id;
  const customOrderId = req.params.id;
  const customOrder = await CustomOrderService.startWork(sellerId, customOrderId);
  return res.json(createSuccessResponse(customOrder, 'Custom order is now in progress.'));
});

export const completeWork = asyncHandler(async (req, res) => {
  const sellerId = req.user._id;
  const customOrderId = req.params.id;
  const customOrder = await CustomOrderService.completeWork(sellerId, customOrderId);
  return res.json(createSuccessResponse(customOrder, 'Custom order marked completed.'));
});

export const cancelCustomOrder = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const customOrderId = req.params.id;
  const { reason } = req.body;
  const customOrder = await CustomOrderService.cancelCustomOrder(userId, role, customOrderId, reason);
  return res.json(createSuccessResponse(customOrder, 'Custom order cancelled successfully.'));
});

export const getCustomOrderById = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const customOrderId = req.params.id;

  const customOrder = await CustomOrderRepository.findByIdWithPopulated(customOrderId);
  if (!customOrder) {
    throw new ApiError(404, 'Custom order not found.');
  }

  // Access Control: Super Admin, requesting customer, or the target store owner
  const isCustomer = String(customOrder.user._id || customOrder.user) === String(userId);
  const isStoreOwner = customOrder.store && String(customOrder.store.owner) === String(userId);
  const isAdmin = role === Roles.SUPER_ADMIN;

  if (!isCustomer && !isStoreOwner && !isAdmin) {
    throw new ApiError(403, 'Unauthorized access to this custom order.');
  }

  return res.json(createSuccessResponse(customOrder));
});

export const listCustomOrders = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { status, page = 1, limit = 20 } = req.query;

  const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const parsedLimit = parseInt(limit, 10);

  let filter = {};
  if (status) {
    filter.status = status;
  }

  if (role === Roles.CUSTOMER) {
    filter.user = userId;
  } else if (role === Roles.SELLER) {
    const store = await Store.findOne({ owner: userId, deletedAt: null });
    if (!store) {
      return res.json(createSuccessResponse({ list: [], total: 0 }));
    }
    filter.store = store._id;
  } else if (role !== Roles.SUPER_ADMIN) {
    throw new ApiError(403, 'Unauthorized access.');
  }

  const list = await CustomOrderRepository.list(filter, { skip, limit: parsedLimit });
  const total = await CustomOrderRepository.count(filter);

  return res.json(createSuccessResponse({ list, total }));
});
