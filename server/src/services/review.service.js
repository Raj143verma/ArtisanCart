import mongoose from 'mongoose';
import { ReviewRepository } from '../repositories/review.repository.js';
import { Product } from '../models/product.model.js';
import { Order } from '../models/order.model.js';
import { Review } from '../models/review.model.js';
import { Store } from '../models/store.model.js';
import { ApiError } from '../utils/ApiError.js';
import { Roles } from '../constants/roles.js';
import { NotificationService } from './notification.service.js';

// Atomic aggregator helper to maintain product rating cache counters
async function updateProductRatingStats(productId, deltaRating, deltaCount, session = null) {
  const options = session ? { session } : {};
  await Product.findByIdAndUpdate(
    productId,
    [
      {
        $set: {
          ratingSum: { $max: [0, { $add: ['$ratingSum', deltaRating] }] },
          totalReviews: { $max: [0, { $add: ['$totalReviews', deltaCount] }] },
        },
      },
      {
        $set: {
          averageRating: {
            $cond: [
              { $eq: ['$totalReviews', 0] },
              0,
              { $round: [{ $divide: ['$ratingSum', '$totalReviews'] }, 2] },
            ],
          },
        },
      },
    ],
    options
  );
}

export const ReviewService = {
  create: async (payload, userId, userRole) => {
    if (userRole !== Roles.CUSTOMER) {
      throw new ApiError(403, 'Only customers can write product reviews.');
    }

    const { productId, rating, title, comment, images } = payload;

    const dbSession = await mongoose.startSession();
    try {
      let createdReview;
      await dbSession.withTransaction(async () => {
        // 1. Verify product exists
        const product = await Product.findById(productId).where({ deletedAt: null }).session(dbSession);
        if (!product) {
          throw new ApiError(404, 'Product not found.');
        }

        // 2. Verify customer has a delivered order for this product
        const orderExists = await Order.findOne({
          customer: userId,
          status: 'delivered',
          'items.product': productId,
        }).session(dbSession);
        if (!orderExists) {
          throw new ApiError(
            403,
            'You can only review products you have purchased and received successfully.'
          );
        }

        // 3. Ensure customer hasn't reviewed this product already (Unique Constraint check)
        const existingReview = await Review.findOne({
          user: userId,
          product: productId,
          deletedAt: null,
        }).session(dbSession);
        if (existingReview) {
          throw new ApiError(400, 'You have already submitted a review for this product.');
        }

        // 4. Create review document
        const review = new Review({
          user: userId,
          product: productId,
          rating,
          title,
          comment,
          images,
          isVerifiedPurchase: true,
          status: 'approved',
        });

        try {
          await review.save({ session: dbSession });
        } catch (error) {
          if (error.code === 11000) {
            throw new ApiError(400, 'You have already submitted a review for this product.');
          }
          throw error;
        }

        // 5. Update parent product's rating cache counters atomically
        await updateProductRatingStats(productId, rating, 1, dbSession);

        const populatedProduct = await Product.findById(productId).populate('store').session(dbSession);
        if (populatedProduct && populatedProduct.store) {
          await NotificationService.sendNotification(populatedProduct.store.owner, {
            type: 'system',
            title: 'New Product Review',
            message: `A customer has reviewed your product: "${populatedProduct.title}".`,
            metadata: { reviewId: review._id, productId },
          }, dbSession);
        }

        createdReview = review;
      });
      return createdReview;
    } finally {
      await dbSession.endSession();
    }
  },

  update: async (id, payload, userId) => {
    const { rating, title, comment } = payload;

    const dbSession = await mongoose.startSession();
    try {
      let updatedReview;
      await dbSession.withTransaction(async () => {
        // 1. Fetch review inside transaction
        const review = await Review.findById(id).session(dbSession);
        if (!review || review.deletedAt) {
          throw new ApiError(404, 'Review not found.');
        }

        // 2. Validate authorship ownership
        if (String(review.user) !== String(userId)) {
          throw new ApiError(403, 'You are not authorized to edit this review.');
        }

        // 3. Check edit deadline window rule
        const editWindowDays = Number(process.env.REVIEW_EDIT_WINDOW_DAYS || 30);
        const creationTime = new Date(review.createdAt).getTime();
        const deadline = creationTime + editWindowDays * 24 * 60 * 60 * 1000;
        if (Date.now() > deadline) {
          throw new ApiError(
            400,
            `Reviews can only be edited within ${editWindowDays} days of submission.`
          );
        }

        // 4. Calculate rating difference using actual current rating from DB
        const oldRating = review.rating;
        const newRating = typeof rating !== 'undefined' ? rating : oldRating;
        const deltaRating = newRating - oldRating;

        // 5. Perform review update inside session
        review.rating = newRating;
        if (typeof title !== 'undefined') review.title = title;
        if (typeof comment !== 'undefined') review.comment = comment;

        await review.save({ session: dbSession });

        // 6. Recalculate and update parent product rating sum dynamically inside session
        if (deltaRating !== 0 && !review.isHidden) {
          await updateProductRatingStats(review.product, deltaRating, 0, dbSession);
        }

        updatedReview = review;
      });
      return updatedReview;
    } finally {
      await dbSession.endSession();
    }
  },

  reply: async (id, comment, userId, userRole) => {
    if (userRole !== Roles.SELLER) {
      throw new ApiError(403, 'Only sellers can reply to product reviews.');
    }

    // 1. Fetch review (un-transactional is fine as it's a single document write)
    const review = await ReviewRepository.findById(id);
    if (!review) {
      throw new ApiError(404, 'Review not found.');
    }

    // 2. Fetch parent product to resolve associated store
    const product = await Product.findById(review.product).where({ deletedAt: null });
    if (!product) {
      throw new ApiError(404, 'Product associated with this review was not found.');
    }

    // 3. Verify user owns the store that sells the product
    const store = await Store.findOne({ owner: userId, deletedAt: null });
    if (!store || String(product.store) !== String(store._id)) {
      throw new ApiError(
        403,
        'You are not authorized to respond to this review as you are not the store owner.'
      );
    }

    // 4. Ensure store reply is unique (1 reply limit)
    if (review.sellerReply && review.sellerReply.comment) {
      throw new ApiError(400, 'You have already replied to this review. Only one reply is allowed.');
    }

    // 5. Embed the seller's response subdocument
    review.sellerReply = {
      comment,
      repliedBy: userId,
      createdAt: new Date(),
    };

    await review.save();

    await NotificationService.sendNotification(review.user, {
      type: 'system',
      title: 'Artisan Replied to Review',
      message: `The seller has responded to your review on product "${product.title}".`,
      metadata: { reviewId: review._id, productId: product._id },
    });

    return review;
  },

  list: async (productId, query = {}, opts = {}) => {
    // Public retrieval only shows non-hidden and non-deleted reviews
    const filter = {
      product: productId,
      isHidden: false,
      deletedAt: null,
    };

    if (query.rating) {
      filter.rating = Number(query.rating);
    }

    const page = opts.page || 1;
    const limit = opts.limit || 20;
    const skip = (page - 1) * limit;

    const docs = await ReviewRepository.list(filter, { skip, limit });
    const total = await ReviewRepository.count(filter);

    return {
      docs,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  },

  hide: async (id) => {
    const dbSession = await mongoose.startSession();
    try {
      let updatedReview;
      await dbSession.withTransaction(async () => {
        const review = await Review.findById(id).session(dbSession);
        if (!review || review.deletedAt) {
          throw new ApiError(404, 'Review not found.');
        }

        if (review.isHidden) {
          updatedReview = review;
          return;
        }

        review.isHidden = true;
        await review.save({ session: dbSession });

        // Remove hidden review rating from product aggregates
        await updateProductRatingStats(review.product, -review.rating, -1, dbSession);

        updatedReview = review;
      });
      return updatedReview;
    } finally {
      await dbSession.endSession();
    }
  },

  restore: async (id) => {
    const dbSession = await mongoose.startSession();
    try {
      let updatedReview;
      await dbSession.withTransaction(async () => {
        const review = await Review.findById(id).session(dbSession);
        if (!review) {
          throw new ApiError(404, 'Review not found.');
        }

        const wasContributing = !review.isHidden && !review.deletedAt;
        if (wasContributing) {
          updatedReview = review;
          return;
        }

        review.isHidden = false;
        review.deletedAt = null;
        await review.save({ session: dbSession });

        // Re-add review rating to product aggregates
        await updateProductRatingStats(review.product, review.rating, 1, dbSession);

        updatedReview = review;
      });
      return updatedReview;
    } finally {
      await dbSession.endSession();
    }
  },

  softDelete: async (id, userId, userRole) => {
    const dbSession = await mongoose.startSession();
    try {
      let success = false;
      await dbSession.withTransaction(async () => {
        const review = await Review.findById(id).session(dbSession);
        if (!review || review.deletedAt) {
          throw new ApiError(404, 'Review not found.');
        }

        // Authorization: User must be author or Admin
        if (userRole !== Roles.SUPER_ADMIN && String(review.user) !== String(userId)) {
          throw new ApiError(403, 'You are not authorized to delete this review.');
        }

        review.deletedAt = new Date();
        await review.save({ session: dbSession });

        // If it wasn't hidden prior to delete, subtract rating stats from parent product
        if (!review.isHidden) {
          await updateProductRatingStats(review.product, -review.rating, -1, dbSession);
        }

        success = true;
      });
      return success;
    } finally {
      await dbSession.endSession();
    }
  },
};
