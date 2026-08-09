import Joi from 'joi';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const createCouponSchema = Joi.object({
  code: Joi.string().required().uppercase().trim().min(3).max(15),
  description: Joi.string().allow('', null).default(''),
  discountType: Joi.string().valid('percentage', 'fixed').required(),
  discountValue: Joi.number().min(0).required(),
  maximumDiscount: Joi.number().min(0).default(0),
  minimumOrderValue: Joi.number().min(0).default(0),
  startDate: Joi.date().required(),
  endDate: Joi.date().min(Joi.ref('startDate')).required(),
  usageLimit: Joi.number().integer().min(0).default(0),
  perUserLimit: Joi.number().integer().min(1).default(1),
  isActive: Joi.boolean().default(true),
  scope: Joi.string().valid('marketplace', 'store', 'product', 'category').default('marketplace'),
  store: Joi.string().pattern(objectIdPattern).allow(null).default(null),
  products: Joi.array().items(Joi.string().pattern(objectIdPattern)).default([]),
  categories: Joi.array().items(Joi.string().pattern(objectIdPattern)).default([]),
  eligibleCustomers: Joi.array().items(Joi.string().pattern(objectIdPattern)).default([]),
});

export const updateCouponSchema = Joi.object({
  code: Joi.string().uppercase().trim().min(3).max(15),
  description: Joi.string().allow('', null),
  discountType: Joi.string().valid('percentage', 'fixed'),
  discountValue: Joi.number().min(0),
  maximumDiscount: Joi.number().min(0),
  minimumOrderValue: Joi.number().min(0),
  startDate: Joi.date(),
  endDate: Joi.date(),
  usageLimit: Joi.number().integer().min(0),
  perUserLimit: Joi.number().integer().min(1),
  isActive: Joi.boolean(),
  scope: Joi.string().valid('marketplace', 'store', 'product', 'category'),
  store: Joi.string().pattern(objectIdPattern).allow(null),
  products: Joi.array().items(Joi.string().pattern(objectIdPattern)),
  categories: Joi.array().items(Joi.string().pattern(objectIdPattern)),
  eligibleCustomers: Joi.array().items(Joi.string().pattern(objectIdPattern)),
});

export const listCouponsQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
  scope: Joi.string().valid('marketplace', 'store', 'product', 'category'),
  isActive: Joi.boolean(),
});
