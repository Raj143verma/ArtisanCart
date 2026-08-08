import { asyncHandler } from '../utils/asyncHandler.js';
import { ReviewService } from '../services/review.service.js';
import { createSuccessResponse, createErrorResponse } from '../helpers/responseHelper.js';

export const createReview = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;
  const review = await ReviewService.create(req.body, userId, userRole);
  return res.status(201).json(createSuccessResponse(review, 'Review submitted successfully'));
});

export const updateReview = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const userId = req.user._id;
  const updated = await ReviewService.update(id, req.body, userId);
  return res.json(createSuccessResponse(updated, 'Review updated successfully'));
});

export const replyToReview = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const { comment } = req.body;
  const userId = req.user._id;
  const review = await ReviewService.reply(id, comment, userId, req.user.role);
  return res.json(createSuccessResponse(review, 'Reply added successfully'));
});

export const listProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { rating, page, limit } = req.query;

  const result = await ReviewService.list(
    productId,
    { rating },
    { page: Number(page), limit: Number(limit) }
  );

  return res.json(
    createSuccessResponse(result.docs, 'Reviews listed successfully', {
      total: result.total,
      page: result.page,
      limit: result.limit,
      pages: result.pages,
    })
  );
});

export const moderateReview = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const { action } = req.body;

  let review;
  if (action === 'hide') {
    review = await ReviewService.hide(id);
  } else if (action === 'restore') {
    review = await ReviewService.restore(id);
  } else {
    return res.status(400).json(createErrorResponse("Invalid action. Must be 'hide' or 'restore'."));
  }

  return res.json(createSuccessResponse(review, `Review successfully ${action}n`));
});

export const deleteReview = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const userId = req.user._id;
  const userRole = req.user.role;

  await ReviewService.softDelete(id, userId, userRole);
  return res.json(createSuccessResponse(null, 'Review deleted successfully'));
});
