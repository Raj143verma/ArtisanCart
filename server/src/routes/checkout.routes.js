import express from 'express';
import * as controller from '../controllers/checkout.controller.js';
import { authMiddleware } from '../middleware/auth/authMiddleware.js';
import { validateRequest } from '../validators/validator.js';
import { initCheckoutSchema } from '../validators/checkout.validator.js';

const router = express.Router();

// All checkout endpoints require user authentication
router.use(authMiddleware);

router.post('/', validateRequest(initCheckoutSchema), controller.initCheckout);
router.get('/:sessionId', controller.getCheckout);
router.post('/:sessionId/cancel', controller.cancelCheckout);

export default router;
