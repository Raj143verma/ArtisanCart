import Joi from 'joi';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const addWishlistItemSchema = Joi.object({
  productId: Joi.string().pattern(objectIdPattern).required().messages({
    'string.pattern.base': 'Invalid Product ID format',
  }),
  variantId: Joi.string().pattern(objectIdPattern).required().messages({
    'string.pattern.base': 'Invalid Variant ID format',
  }),
});

export const removeWishlistItemSchema = Joi.object({
  productId: Joi.string().pattern(objectIdPattern).required().messages({
    'string.pattern.base': 'Invalid Product ID format',
  }),
  variantId: Joi.string().pattern(objectIdPattern).required().messages({
    'string.pattern.base': 'Invalid Variant ID format',
  }),
});

export const checkWishlistItemSchema = Joi.object({
  productId: Joi.string().pattern(objectIdPattern).required().messages({
    'string.pattern.base': 'Invalid Product ID format',
  }),
  variantId: Joi.string().pattern(objectIdPattern).required().messages({
    'string.pattern.base': 'Invalid Variant ID format',
  }),
});

export const listWishlistQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
});
