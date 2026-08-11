import { asyncHandler } from '../utils/asyncHandler.js';
import { StoreKYCService } from '../services/storeKYC.service.js';
import { StoreKYCRepository } from '../repositories/storeKYC.repository.js';
import { createSuccessResponse } from '../helpers/responseHelper.js';
import { Roles } from '../constants/roles.js';
import { ApiError } from '../utils/ApiError.js';

export const submitKYC = asyncHandler(async (req, res) => {
  const sellerId = req.user._id;
  const kyc = await StoreKYCService.submitKYC(sellerId, req.body);
  return res.status(201).json(createSuccessResponse(kyc, 'KYC details submitted successfully. Verification is pending.'));
});

export const getKYCProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { sellerId } = req.query; // Admin can query a specific seller

  const profile = await StoreKYCService.getKYCProfile(userId, role, sellerId);
  return res.json(createSuccessResponse(profile, 'KYC profile retrieved successfully.'));
});

export const reviewKYC = asyncHandler(async (req, res) => {
  const adminId = req.user._id;
  const role = req.user.role;
  const { kycId } = req.params;

  const updated = await StoreKYCService.reviewKYC(adminId, role, kycId, req.body, req);
  return res.json(createSuccessResponse(updated, 'KYC verification review completed.'));
});

export const listKYCSubmissions = asyncHandler(async (req, res) => {
  const role = req.user.role;
  if (role !== Roles.SUPER_ADMIN) {
    throw new ApiError(403, 'Unauthorized access.');
  }

  const { limit, skip, status, sellerId } = req.query;
  const parsedLimit = limit ? Number(limit) : 20;
  const parsedSkip = skip ? Number(skip) : 0;

  const filter = {};
  if (status) filter.verificationStatus = status;
  if (sellerId) filter.seller = sellerId;

  const submissions = await StoreKYCRepository.list(filter, parsedLimit, parsedSkip);
  const total = await StoreKYCRepository.count(filter);

  return res.json(createSuccessResponse({ submissions, total }, 'KYC submissions list retrieved successfully.'));
});
