import express from 'express';
import * as controller from '../controllers/customOrder.controller.js';
import { authMiddleware } from '../middleware/auth/authMiddleware.js';
import { roleMiddleware } from '../middleware/auth/roleMiddleware.js';
import { validateRequest, validateQuery } from '../validators/validator.js';
import {
  createCustomOrderSchema,
  submitQuoteSchema,
  listCustomOrdersSchema,
} from '../validators/customOrder.validator.js';
import { Roles } from '../constants/roles.js';

const router = express.Router();

// All custom order routes require authentication
router.use(authMiddleware);

// Request a bespoke custom order (Customers only)
router.post(
  '/',
  roleMiddleware(Roles.CUSTOMER),
  validateRequest(createCustomOrderSchema),
  controller.createRequest
);

// List custom orders (Role-based access details handled in controller)
router.get('/', validateQuery(listCustomOrdersSchema), controller.listCustomOrders);

// Get specific custom order detail by ID
router.get('/:id', controller.getCustomOrderById);

// Submit a quote/budget for custom order request (Sellers only)
router.post(
  '/:id/quote',
  roleMiddleware(Roles.SELLER),
  validateRequest(submitQuoteSchema),
  controller.submitQuote
);

// Accept quote and approve order details (Customers only)
router.post('/:id/approve', roleMiddleware(Roles.CUSTOMER), controller.approveQuote);

// Mark custom order in progress (Sellers only)
router.post('/:id/start', roleMiddleware(Roles.SELLER), controller.startWork);

// Mark custom order completed (Sellers only)
router.post('/:id/complete', roleMiddleware(Roles.SELLER), controller.completeWork);

// Cancel custom order request
router.post('/:id/cancel', controller.cancelCustomOrder);

export default router;
