import express from 'express';
import * as controller from '../controllers/payout.controller.js';
import { authMiddleware } from '../middleware/auth/authMiddleware.js';
import { roleMiddleware } from '../middleware/auth/roleMiddleware.js';
import { validateRequest } from '../validators/validator.js';
import { requestPayoutSchema, processPayoutSchema, getLedgerSchema } from '../validators/payout.validator.js';
import { Roles } from '../constants/roles.js';

const router = express.Router();

// All payout routes require authentication
router.use(authMiddleware);

// Retrieve balance and ledger statements
router.get('/balance', controller.getBalance);
router.get('/ledger', validateRequest(getLedgerSchema), controller.getLedger);

// Merchant payout requests
router.post('/request', roleMiddleware(Roles.SELLER), validateRequest(requestPayoutSchema), controller.requestPayout);
router.get('/requests', controller.listPayoutRequests);

// Admin payout processing
router.put('/requests/:payoutId/process', roleMiddleware(Roles.SUPER_ADMIN), validateRequest(processPayoutSchema), controller.processPayout);

export default router;
