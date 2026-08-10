import Joi from 'joi';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const requestPayoutSchema = Joi.object({
  amount: Joi.number().min(10).required().messages({
    'number.min': 'Payout request amount must be at least $10.',
    'any.required': 'Payout amount is required.',
  }),
  idempotencyKey: Joi.string().required().messages({
    'any.required': 'Idempotency key is required.',
  }),
});

export const processPayoutSchema = Joi.object({
  status: Joi.string()
    .valid('completed', 'rejected')
    .required()
    .messages({
      'any.only': 'Invalid status. Must be completed or rejected.',
    }),
  rejectionReason: Joi.string()
    .trim()
    .max(500)
    .allow('', null)
    .when('status', {
      is: 'rejected',
      then: Joi.required().messages({
        'any.required': 'Rejection reason is required when rejecting a payout.',
        'string.empty': 'Rejection reason is required when rejecting a payout.',
      }),
    }),
});

export const getLedgerSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  skip: Joi.number().integer().min(0).default(0),
  storeId: Joi.string().regex(objectIdPattern).allow(null, '').messages({
    'string.pattern.base': 'Invalid storeId format.',
  }),
});
