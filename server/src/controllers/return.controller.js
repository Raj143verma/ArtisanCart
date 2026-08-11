import { asyncHandler } from '../utils/asyncHandler.js';
import { ReturnService } from '../services/return.service.js';
import { ReturnRequestRepository } from '../repositories/returnRequest.repository.js';
import { Store } from '../models/store.model.js';
import { createSuccessResponse } from '../helpers/responseHelper.js';
import { Roles } from '../constants/roles.js';
import { ApiError } from '../utils/ApiError.js';

export const requestReturn = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const returnRequest = await ReturnService.requestReturn(customerId, req.body);
  return res.status(201).json(createSuccessResponse(returnRequest, 'Return requested successfully'));
});

export const approveReturn = asyncHandler(async (req, res) => {
  const sellerId = req.user._id;
  const { returnId } = req.params;
  const returnRequest = await ReturnService.approveReturn(sellerId, returnId, req.body);
  return res.json(createSuccessResponse(returnRequest, 'Return approved successfully'));
});

export const rejectReturn = asyncHandler(async (req, res) => {
  const sellerId = req.user._id;
  const { returnId } = req.params;
  const returnRequest = await ReturnService.rejectReturn(sellerId, returnId, req.body);
  return res.json(createSuccessResponse(returnRequest, 'Return rejected successfully'));
});

export const disputeRejection = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const { returnId } = req.params;
  const returnRequest = await ReturnService.disputeRejection(customerId, returnId, req.body);
  return res.json(createSuccessResponse(returnRequest, 'Rejection disputed successfully'));
});

export const shipReturn = asyncHandler(async (req, res) => {
  const customerId = req.user._id;
  const { returnId } = req.params;
  const returnRequest = await ReturnService.shipReturn(customerId, returnId, req.body);
  return res.json(createSuccessResponse(returnRequest, 'Return items marked as shipped successfully'));
});

export const resolveDispute = asyncHandler(async (req, res) => {
  const adminId = req.user._id;
  const role = req.user.role;
  const { returnId } = req.params;
  const returnRequest = await ReturnService.resolveDispute(adminId, role, returnId, req.body, req);
  return res.json(createSuccessResponse(returnRequest, 'Dispute resolved successfully'));
});

export const receiveReturn = asyncHandler(async (req, res) => {
  const sellerId = req.user._id;
  const { returnId } = req.params;
  const returnRequest = await ReturnService.receiveReturn(sellerId, returnId);
  return res.json(createSuccessResponse(returnRequest, 'Return items marked as received and refund completed'));
});

export const listReturns = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { limit, skip, status, storeId } = req.query;

  const parsedLimit = limit ? Number(limit) : 20;
  const parsedSkip = skip ? Number(skip) : 0;

  const filter = {};
  if (status) filter.status = status;

  if (role === Roles.CUSTOMER) {
    filter.customer = userId;
  } else if (role === Roles.SELLER) {
    const store = await Store.findOne({ owner: userId, deletedAt: null });
    if (!store) {
      filter.store = null;
    } else {
      filter.store = store._id;
    }
  } else if (role === Roles.SUPER_ADMIN && storeId) {
    filter.store = storeId;
  }

  const returns = await ReturnRequestRepository.list(filter, parsedLimit, parsedSkip);
  const total = await ReturnRequestRepository.count(filter);

  return res.json(createSuccessResponse({ returns, total }, 'Returns list retrieved successfully'));
});

export const getReturnDetail = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { returnId } = req.params;

  const returnRequest = await ReturnRequestRepository.findById(returnId);
  if (!returnRequest) {
    throw new ApiError(404, 'Return request not found.');
  }

  // Security checks
  if (role === Roles.CUSTOMER) {
    if (String(returnRequest.customer) !== String(userId)) {
      throw new ApiError(403, 'Unauthorized access to this return request.');
    }
  } else if (role === Roles.SELLER) {
    const store = await Store.findOne({ owner: userId, deletedAt: null });
    if (!store || String(returnRequest.store) !== String(store._id)) {
      throw new ApiError(403, 'Unauthorized access to this return request.');
    }
  }

  return res.json(createSuccessResponse(returnRequest, 'Return request details retrieved successfully'));
});
