import { asyncHandler } from '../utils/asyncHandler.js';
import { CartService } from '../services/cart.service.js';
import { createSuccessResponse } from '../helpers/responseHelper.js';

export const getCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const cart = await CartService.getOrCreateCart(userId, role);
  return res.json(createSuccessResponse(cart, 'Cart retrieved successfully'));
});

export const addItem = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const cart = await CartService.addItem(userId, role, req.body);
  return res.json(createSuccessResponse(cart, 'Item added to cart successfully'));
});

export const updateQuantity = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { variantId } = req.params;
  const { quantity } = req.body;
  const cart = await CartService.updateQuantity(userId, role, variantId, quantity);
  return res.json(createSuccessResponse(cart, 'Cart item quantity updated successfully'));
});

export const removeItem = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { variantId } = req.params;
  const cart = await CartService.removeItem(userId, role, variantId);
  return res.json(createSuccessResponse(cart, 'Item removed from cart successfully'));
});

export const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const cart = await CartService.clearCart(userId, role);
  return res.json(createSuccessResponse(cart, 'Cart cleared successfully'));
});
