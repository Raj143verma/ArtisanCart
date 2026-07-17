import { asyncHandler } from '../utils/asyncHandler.js';
import { CheckoutSessionService } from '../services/checkoutSession.service.js';
import { createSuccessResponse } from '../helpers/responseHelper.js';

export const initCheckout = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const session = await CheckoutSessionService.initCheckout(userId, role, req.body);
  return res.status(201).json(createSuccessResponse(session, 'Checkout session initialized successfully'));
});

export const getCheckout = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { sessionId } = req.params;
  const session = await CheckoutSessionService.getCheckout(sessionId, userId, role);
  return res.json(createSuccessResponse(session, 'Checkout session retrieved successfully'));
});

export const cancelCheckout = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { sessionId } = req.params;
  const session = await CheckoutSessionService.cancelCheckout(sessionId, userId, role);
  return res.json(createSuccessResponse(session, 'Checkout session cancelled successfully'));
});
