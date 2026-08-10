import { asyncHandler } from '../utils/asyncHandler.js';
import { PayoutService } from '../services/payout.service.js';
import { PayoutRequestRepository } from '../repositories/payoutRequest.repository.js';
import { createSuccessResponse } from '../helpers/responseHelper.js';
import { Roles } from '../constants/roles.js';

export const getBalance = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { storeId } = req.query;
  const balance = await PayoutService.getStoreBalance(userId, role, storeId);
  return res.json(createSuccessResponse(balance, 'Balance retrieved successfully'));
});

export const getLedger = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { limit, skip, storeId } = req.query;
  const result = await PayoutService.getLedgerHistory(userId, role, {
    limit: limit ? Number(limit) : 20,
    skip: skip ? Number(skip) : 0,
    storeId,
  });
  return res.json(createSuccessResponse(result, 'Ledger history retrieved successfully'));
});

export const requestPayout = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { amount, idempotencyKey } = req.body;
  const payout = await PayoutService.requestPayout(userId, amount, idempotencyKey);
  return res.status(201).json(createSuccessResponse(payout, 'Payout requested successfully'));
});

export const processPayout = asyncHandler(async (req, res) => {
  const adminId = req.user._id;
  const role = req.user.role;
  const { payoutId } = req.params;
  const payout = await PayoutService.processPayout(adminId, role, payoutId, req.body);
  return res.json(createSuccessResponse(payout, 'Payout request processed successfully'));
});

export const listPayoutRequests = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { limit, skip, status } = req.query;

  const parsedLimit = limit ? Number(limit) : 20;
  const parsedSkip = skip ? Number(skip) : 0;

  const filter = {};
  if (role === Roles.SELLER) {
    filter.seller = userId;
  }
  if (status) {
    filter.status = status;
  }

  const payouts = await PayoutRequestRepository.listAll(filter, parsedLimit, parsedSkip);
  const total = await PayoutRequestRepository.countAll(filter);

  return res.json(createSuccessResponse({ payouts, total }, 'Payout requests listed successfully'));
});
