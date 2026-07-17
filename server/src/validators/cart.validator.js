import Joi from 'joi';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const addItemSchema = Joi.object({
  productId: Joi.string().pattern(objectIdPattern).required().messages({
    'string.pattern.base': 'Invalid Product ID format',
  }),
  variantId: Joi.string().pattern(objectIdPattern).required().messages({
    'string.pattern.base': 'Invalid Variant ID format',
  }),
  quantity: Joi.number().integer().min(1).default(1),
});

export const updateQuantitySchema = Joi.object({
  quantity: Joi.number().integer().min(1).required(),
});
