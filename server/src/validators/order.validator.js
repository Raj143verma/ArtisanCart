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

export const shipOrderSchema = Joi.object({
  carrier: Joi.string()
    .valid('usps', 'ups', 'fedex', 'dhl', 'other')
    .required()
    .messages({
      'any.only': 'Invalid carrier name. Must be one of: usps, ups, fedex, dhl, other.',
    }),
  trackingNumber: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Tracking number is required.',
      'any.required': 'Tracking number is required.',
    }),
  trackingUrl: Joi.string()
    .trim()
    .uri()
    .when('carrier', {
      is: 'other',
      then: Joi.required().messages({
        'any.required': 'trackingUrl is required when carrier is "other".',
        'string.empty': 'trackingUrl is required when carrier is "other".',
      }),
      otherwise: Joi.allow('', null),
    }),
});
