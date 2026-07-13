import { asyncHandler } from '../utils/asyncHandler.js';
import { ProductVariantService } from '../services/productVariant.service.js';
import { createSuccessResponse, createErrorResponse } from '../helpers/responseHelper.js';

export const createVariant = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const userId = req.user._id;
  const variant = await ProductVariantService.create(productId, req.body, userId);
  return res.status(201).json(createSuccessResponse(variant, 'Product variant created successfully'));
});

export const updateVariant = asyncHandler(async (req, res) => {
  const { variantId } = req.params;
  const userId = req.user._id;
  const role = req.user.role;
  const updated = await ProductVariantService.update(variantId, req.body, userId, role);
  return res.json(createSuccessResponse(updated, 'Product variant updated successfully'));
});

export const deleteVariant = asyncHandler(async (req, res) => {
  const { variantId } = req.params;
  const userId = req.user._id;
  const role = req.user.role;
  const result = await ProductVariantService.softDelete(variantId, userId, role);
  if (!result) {
    return res.status(404).json(createErrorResponse('Product variant not found.'));
  }
  return res.json(createSuccessResponse(null, 'Product variant deleted successfully'));
});

export const restoreVariant = asyncHandler(async (req, res) => {
  const { variantId } = req.params;
  const userId = req.user._id;
  const role = req.user.role;
  const result = await ProductVariantService.restore(variantId, userId, role);
  if (!result) {
    return res.status(404).json(createErrorResponse('Product variant not found.'));
  }
  return res.json(createSuccessResponse(null, 'Product variant restored successfully'));
});

export const getVariant = asyncHandler(async (req, res) => {
  const { variantId } = req.params;
  const variant = await ProductVariantService.getById(variantId);
  if (!variant) {
    return res.status(404).json(createErrorResponse('Product variant not found.'));
  }
  return res.json(createSuccessResponse(variant, 'Product variant retrieved successfully'));
});

export const listVariants = asyncHandler(async (req, res) => {
  const productId = req.params.id;
  const user = req.user; // Populated by optionalAuthMiddleware
  const userRole = user ? user.role : null;
  const userId = user ? user._id : null;

  const variants = await ProductVariantService.listForProduct(productId, userRole, userId);
  return res.json(createSuccessResponse(variants, 'Product variants listed successfully'));
});

export const toggleActiveVariant = asyncHandler(async (req, res) => {
  const { variantId } = req.params;
  const value = req.body.value === true || req.body.value === 'true';
  const userId = req.user._id;
  const role = req.user.role;

  const updated = await ProductVariantService.toggleActive(variantId, value, userId, role);
  if (!updated) {
    return res.status(404).json(createErrorResponse('Product variant not found.'));
  }
  return res.json(createSuccessResponse(updated, 'Variant active state updated successfully'));
});
