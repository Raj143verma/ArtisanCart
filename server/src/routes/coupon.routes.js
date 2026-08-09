import express from 'express';
import * as controller from '../controllers/coupon.controller.js';
import { authMiddleware } from '../middleware/auth/authMiddleware.js';
import { roleMiddleware } from '../middleware/auth/roleMiddleware.js';
import { validateRequest, validateQuery } from '../validators/validator.js';
import {
  createCouponSchema,
  updateCouponSchema,
  listCouponsQuerySchema,
} from '../validators/coupon.validator.js';
import { Roles } from '../constants/roles.js';

const router = express.Router();

// All coupon endpoints require authentication
router.use(authMiddleware);

// List coupons (accessible to Customers, Sellers, Admins)
router.get('/', validateQuery(listCouponsQuerySchema), controller.listCoupons);

// Get specific coupon details (Sellers & Admins only)
router.get('/:id', roleMiddleware(Roles.SELLER), controller.getCouponById);

// Create coupon (Sellers & Admins only)
router.post(
  '/',
  roleMiddleware(Roles.SELLER),
  validateRequest(createCouponSchema),
  controller.createCoupon
);

// Update coupon (Sellers & Admins only)
router.put(
  '/:id',
  roleMiddleware(Roles.SELLER),
  validateRequest(updateCouponSchema),
  controller.updateCoupon
);

// Soft delete coupon (Sellers & Admins only)
router.delete('/:id', roleMiddleware(Roles.SELLER), controller.deleteCoupon);

export default router;
