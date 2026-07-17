import { asyncHandler } from '../utils/asyncHandler.js';
import { PaymentService } from '../services/payment.service.js';
import { createSuccessResponse } from '../helpers/responseHelper.js';

export const initializePayment = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const transaction = await PaymentService.initializePayment(userId, role, req.body);
  return res.status(201).json(createSuccessResponse(transaction, 'Payment transaction initialized successfully'));
});

export const getTransaction = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { transactionId } = req.params;
  const transaction = await PaymentService.getTransaction(transactionId, userId, role);
  return res.json(createSuccessResponse(transaction, 'Transaction retrieved successfully'));
});

export const listPayments = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const payments = await PaymentService.listPayments(userId, role);
  return res.json(createSuccessResponse(payments, 'Payments listed successfully'));
});

export const verifyPaymentResult = asyncHandler(async (req, res) => {
  const { providerSessionId, status } = req.body;
  const transaction = await PaymentService.verifyPaymentResult(providerSessionId, status);
  return res.json(createSuccessResponse(transaction, 'Payment result verified and updated successfully'));
});

export const cancelPayment = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { transactionId } = req.params;
  const transaction = await PaymentService.cancelPayment(transactionId, userId, role);
  return res.json(createSuccessResponse(transaction, 'Payment transaction cancelled successfully'));
});

export const handleWebhook = asyncHandler(async (req, res) => {
  // Production Webhook Notice: In production, raw body parsing (not express.json()) and signature
  // validation (e.g. stripe.webhooks.constructEvent) will be required here.
  const { providerSessionId, status } = req.body;
  const transaction = await PaymentService.verifyPaymentResult(providerSessionId, status);
  return res.json(createSuccessResponse(transaction, 'Webhook processed successfully'));
});
