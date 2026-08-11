
import express from 'express';
import * as controller from '../controllers/return.controller.js';
import { authMiddleware } from '../middleware/auth/authMiddleware.js';
import { roleMiddleware } from '../middleware/auth/roleMiddleware.js';
import { validateRequest, validateQuery } from '../validators/validator.js';
import {
  requestReturnSchema,
  approveReturnSchema,
  rejectReturnSchema,
  disputeRejectionSchema,
  resolveDisputeSchema,
  listReturnsQuerySchema,
  shipReturnSchema,
} from '../validators/return.validator.js';
import { Roles } from '../constants/roles.js';

const router = express.Router();

router.use(authMiddleware);

// Retrieve list and details
router.get('/', validateQuery(listReturnsQuerySchema), controller.listReturns);
router.get('/:returnId', controller.getReturnDetail);

// Customer Actions
router.post('/request', roleMiddleware(Roles.CUSTOMER), validateRequest(requestReturnSchema), controller.requestReturn);
router.put('/:returnId/dispute', roleMiddleware(Roles.CUSTOMER), validateRequest(disputeRejectionSchema), controller.disputeRejection);
router.put('/:returnId/ship', roleMiddleware(Roles.CUSTOMER), validateRequest(shipReturnSchema), controller.shipReturn);

// Seller Actions
router.put('/:returnId/approve', roleMiddleware(Roles.SELLER), validateRequest(approveReturnSchema), controller.approveReturn);
router.put('/:returnId/reject', roleMiddleware(Roles.SELLER), validateRequest(rejectReturnSchema), controller.rejectReturn);
router.put('/:returnId/receive', roleMiddleware(Roles.SELLER), controller.receiveReturn);

// Admin Actions
router.put('/:returnId/resolve', roleMiddleware(Roles.SUPER_ADMIN), validateRequest(resolveDisputeSchema), controller.resolveDispute);

export default router;
