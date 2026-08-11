import express from 'express';
import * as controller from '../controllers/storeKYC.controller.js';
import { authMiddleware } from '../middleware/auth/authMiddleware.js';
import { roleMiddleware } from '../middleware/auth/roleMiddleware.js';
import { validateRequest, validateQuery } from '../validators/validator.js';
import {
  submitKYCSchema,
  reviewKYCSchema,
  listKYCQuerySchema,
} from '../validators/storeKYC.validator.js';
import { Roles } from '../constants/roles.js';

const router = express.Router();

// All KYC endpoints require authentication
router.use(authMiddleware);

// Seller Onboarding
router.post(
  '/onboard',
  roleMiddleware(Roles.SELLER),
  validateRequest(submitKYCSchema),
  controller.submitKYC
);

// Retrieve Profile (Seller retrieves own, Admin can pass sellerId query parameter)
router.get(
  '/profile',
  controller.getKYCProfile
);

// Admin Submissions Listing
router.get(
  '/admin/submissions',
  roleMiddleware(Roles.SUPER_ADMIN),
  validateQuery(listKYCQuerySchema),
  controller.listKYCSubmissions
);

// Admin Review Decision
router.put(
  '/admin/:kycId/review',
  roleMiddleware(Roles.SUPER_ADMIN),
  validateRequest(reviewKYCSchema),
  controller.reviewKYC
);

export default router;
