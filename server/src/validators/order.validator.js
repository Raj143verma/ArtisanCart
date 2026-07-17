import Joi from 'joi';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const createOrderSchema = Joi.object({
  checkoutSessionId: Joi.string().regex(objectIdPattern).required().messages({
    'string.pattern.base': 'Invalid checkoutSessionId format.',
  }),
});

export const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')
    .required(),
});

export const cancelOrderSchema = Joi.object({
  cancelReason: Joi.string().max(500).allow('', null).default(''),
});
