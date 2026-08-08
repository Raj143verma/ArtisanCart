import { asyncHandler } from '../utils/asyncHandler.js';
import { WishlistService } from '../services/wishlist.service.js';
import { createSuccessResponse } from '../helpers/responseHelper.js';

export const addWishlistItem = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const wishlist = await WishlistService.add(req.body, userId, role);
  return res.json(createSuccessResponse(wishlist, 'Item added to wishlist successfully'));
});

export const removeWishlistItem = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const wishlist = await WishlistService.remove(req.body, userId, role);
  return res.json(createSuccessResponse(wishlist, 'Item removed from wishlist successfully'));
});

export const clearWishlist = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const wishlist = await WishlistService.clear(userId, role);
  return res.json(createSuccessResponse(wishlist, 'Wishlist cleared successfully'));
});

export const checkWishlistItem = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const { productId, variantId } = req.query;
  const result = await WishlistService.check(productId, variantId, userId, role);
  return res.json(createSuccessResponse(result, 'Wishlist status checked successfully'));
});

export const getWishlist = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const role = req.user.role;
  const result = await WishlistService.getWishlist(req.query, userId, role);
  return res.json(createSuccessResponse(result, 'Wishlist retrieved successfully'));
});
