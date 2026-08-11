import Joi from 'joi';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const requestReturnSchema = Joi.object({
  orderId: Joi.string().regex(objectIdPattern).required().messages({
    'string.pattern.base': 'Invalid orderId format.',
    'any.required': 'orderId is required.',
  }),
  items: Joi.array()
    .items(
      Joi.object({
        product: Joi.string().regex(objectIdPattern).required().messages({
          'string.pattern.base': 'Invalid product ID format.',
          'any.required': 'Product ID is required.',
        }),
        variantSku: Joi.string().required().messages({
          'any.required': 'Variant SKU is required.',
        }),
        quantity: Joi.number().integer().min(1).required().messages({
          'number.min': 'Return quantity must be at least 1.',
          'any.required': 'Return quantity is required.',
        }),
        reason: Joi.string().trim().required().messages({
          'any.required': 'Return reason is required.',
        }),
        condition: Joi.string().valid('new', 'opened', 'damaged').required().messages({
          'any.only': 'Condition must be new, opened, or damaged.',
          'any.required': 'Item condition is required.',
        }),
      })
    )
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one item must be returned.',
      'any.required': 'Return items list is required.',
    }),
});

export const approveReturnSchema = Joi.object({
  carrier: Joi.string().trim().allow(null, ''),
  trackingNumber: Joi.string().trim().allow(null, ''),
  trackingUrl: Joi.string().trim().allow(null, ''),
  sellerNotes: Joi.string().trim().allow(null, ''),
});

export const rejectReturnSchema = Joi.object({
  sellerNotes: Joi.string().trim().required().messages({
    'any.required': 'Reason for rejection is required.',
    'string.empty': 'Reason for rejection is required.',
  }),
});

export const disputeRejectionSchema = Joi.object({
  disputeReason: Joi.string().trim().required().messages({
    'any.required': 'Dispute explanation is required.',
    'string.empty': 'Dispute explanation is required.',
  }),
});

export const shipReturnSchema = Joi.object({
  carrier: Joi.string().trim().required().messages({
    'any.required': 'Carrier is required to ship the return.',
    'string.empty': 'Carrier is required to ship the return.',
  }),
  trackingNumber: Joi.string().trim().required().messages({
    'any.required': 'Tracking number is required to ship the return.',
    'string.empty': 'Tracking number is required to ship the return.',
  }),
  trackingUrl: Joi.string().trim().allow(null, ''),
});

export const resolveDisputeSchema = Joi.object({
  status: Joi.string().valid('approved', 'rejected').required().messages({
    'any.only': 'Dispute status must be resolved as approved or rejected.',
  }),
  rejectionReason: Joi.string()
    .trim()
    .when('status', {
      is: 'rejected',
      then: Joi.required().messages({
        'any.required': 'Rejection reason is required when dispute is resolved as rejected.',
        'string.empty': 'Rejection reason is required when dispute is resolved as rejected.',
      }),
      otherwise: Joi.allow(null, ''),
    }),
});

export const listReturnsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  skip: Joi.number().integer().min(0).default(0),
  status: Joi.string().valid('requested', 'approved', 'rejected', 'shipped', 'received', 'completed', 'disputed', 'cancelled').allow(null, ''),
  storeId: Joi.string().regex(objectIdPattern).allow(null, ''),
});
