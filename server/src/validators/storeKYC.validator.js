import Joi from 'joi';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const submitKYCSchema = Joi.object({
  legalBusinessName: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Legal Business Name must be at least 2 characters.',
    'any.required': 'Legal Business Name is required.',
  }),
  taxId: Joi.string().trim().min(5).max(30).required().messages({
    'string.min': 'Tax ID/EIN must be at least 5 characters.',
    'any.required': 'Tax ID/EIN is required.',
  }),
  bankName: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Bank Name must be at least 2 characters.',
    'any.required': 'Bank Name is required.',
  }),
  accountHolderName: Joi.string().trim().min(2).max(100).required().messages({
    'string.min': 'Account Holder Name must be at least 2 characters.',
    'any.required': 'Account Holder Name is required.',
  }),
  routingNumber: Joi.string().trim().alphanum().min(4).max(20).required().messages({
    'string.min': 'Routing Number must be at least 4 characters.',
    'any.required': 'Routing Number is required.',
  }),
  accountNumber: Joi.string().trim().alphanum().min(4).max(30).required().messages({
    'string.min': 'Account Number must be at least 4 characters.',
    'any.required': 'Account Number is required.',
  }),
});

export const reviewKYCSchema = Joi.object({
  status: Joi.string().valid('verified', 'rejected').required().messages({
    'any.only': 'Review status must be resolved as verified or rejected.',
    'any.required': 'Verification status decision is required.',
  }),
  rejectionReason: Joi.string()
    .trim()
    .when('status', {
      is: 'rejected',
      then: Joi.required().messages({
        'any.required': 'Rejection reason explanation is required when rejecting KYC.',
        'string.empty': 'Rejection reason explanation is required when rejecting KYC.',
      }),
      otherwise: Joi.allow('', null),
    }),
});

export const listKYCQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  skip: Joi.number().integer().min(0).default(0),
  status: Joi.string().valid('pending', 'verified', 'rejected').allow('', null),
  sellerId: Joi.string().regex(objectIdPattern).allow('', null),
});
