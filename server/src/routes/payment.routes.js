import express from 'express';
import * as controller from '../controllers/payment.controller.js';
import { authMiddleware } from '../middleware/auth/authMiddleware.js';
import { validateRequest } from '../validators/validator.js';
import { initializePaymentSchema, verifyPaymentSchema } from '../validators/payment.validator.js';

const router = express.Router();

// Public webhook callback endpoint (bypasses authMiddleware)
// NOTE: In production, this route requires raw body parsing (not express.json())
// to construct and verify the provider signature (e.g. Stripe-Signature / Razorpay-Signature).
router.post('/webhook', controller.handleWebhook);

// Enforce authMiddleware for all other Payment endpoints
router.use(authMiddleware);

router.post('/initialize', validateRequest(initializePaymentSchema), controller.initializePayment);
router.get('/', controller.listPayments);
router.get('/:transactionId', controller.getTransaction);
router.post('/verify', validateRequest(verifyPaymentSchema), controller.verifyPaymentResult);
router.post('/:transactionId/cancel', controller.cancelPayment);

export default router;
