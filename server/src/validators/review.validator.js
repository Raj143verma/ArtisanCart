import Joi from 'joi';

export const createReviewSchema = Joi.object({
  productId: Joi.string().hex().length(24).required(),
  rating: Joi.number().integer().min(1).max(5).required(),
  title: Joi.string().max(100).allow('').default(''),
  comment: Joi.string().min(1).max(2000).required(),
  images: Joi.array().items(
    Joi.object({
      public_id: Joi.string().required(),
      url: Joi.string().uri().required(),
      metadata: Joi.object({
        width: Joi.number(),
        height: Joi.number(),
        bytes: Joi.number(),
        format: Joi.string(),
      }),
    })
  ).default([]),
});

export const updateReviewSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5),
  title: Joi.string().max(100).allow(''),
  comment: Joi.string().min(1).max(2000),
});

export const sellerReplySchema = Joi.object({
  comment: Joi.string().min(1).max(2000).required(),
});

export const listReviewQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  rating: Joi.number().integer().min(1).max(5),
});

export const moderateReviewSchema = Joi.object({
  action: Joi.string().valid('hide', 'restore').required(),
});

