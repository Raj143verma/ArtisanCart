import { asyncHandler } from '../utils/asyncHandler.js';
import { CategoryService } from '../services/category.service.js';
import { validateRequest } from '../validators/validator.js';
import { createSuccessResponse, createErrorResponse } from '../helpers/responseHelper.js';
import { createCategorySchema, updateCategorySchema } from '../validators/category.validator.js';
import { Roles } from '../constants/roles.js';

// Note: Placeholders use existing patterns. Wrap handlers with asyncHandler.

export const createCategory = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const payload = req.body;
  const category = await CategoryService.create(payload, userId);
  return res.status(201).json(createSuccessResponse(category, 'Category created'));
});

export const updateCategory = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const userId = req.user?._id;
  const payload = req.body;
  const updated = await CategoryService.update(id, payload, userId);
  return res.json(createSuccessResponse(updated, 'Category updated'));
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const userId = req.user?._id;
  const result = await CategoryService.softDelete(id, userId);
  if (!result) return res.status(404).json(createErrorResponse('Category not found'));
  return res.json(createSuccessResponse(null, 'Category soft-deleted'));
});

export const restoreCategory = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const userId = req.user?._id;
  const result = await CategoryService.restore(id, userId);
  if (!result) return res.status(404).json(createErrorResponse('Category not found'));
  return res.json(createSuccessResponse(null, 'Category restored'));
});

export const getCategory = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const c = await CategoryService.getById(id);
  if (!c) return res.status(404).json(createErrorResponse('Category not found'));
  return res.json(createSuccessResponse(c, 'Category retrieved'));
});

export const listCategories = asyncHandler(async (req, res) => {
  const { q, slug, featured, active, parent, page, limit } = req.query;
  const docs = await CategoryService.list(
    { q, slug, featured, active, parent },
    { page, limit },
  );
  return res.json(createSuccessResponse(docs, 'Categories listed'));
});

export const getCategoryTree = asyncHandler(async (req, res) => {
  const tree = await CategoryService.getTree();
  return res.json(createSuccessResponse(tree, 'Category tree'));
});

export const toggleFeatured = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const value = req.body.value === true || req.body.value === 'true';
  const userId = req.user?._id;
  const updated = await CategoryService.toggleFeatured(id, value, userId);
  if (!updated) return res.status(404).json(createErrorResponse('Category not found'));
  return res.json(createSuccessResponse(updated, 'Featured toggled'));
});

export const toggleActive = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const value = req.body.value === true || req.body.value === 'true';
  const userId = req.user?._id;
  const updated = await CategoryService.toggleActive(id, value, userId);
  if (!updated) return res.status(404).json(createErrorResponse('Category not found'));
  return res.json(createSuccessResponse(updated, 'Active toggled'));
});
