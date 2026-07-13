import Joi from 'joi';

const dimensionsSchema = Joi.object({
  width: Joi.number().min(0),
  height: Joi.number().min(0),
  depth: Joi.number().min(0),
  unit: Joi.string().allow('cm', 'in', 'mm').default('cm'),
});

const thumbnailSchema = Joi.object({
  public_id: Joi.string().required(),
  url: Joi.string().required(),
});

export const createVariantSchema = Joi.object({
  sku: Joi.string().min(1).max(100).trim().required(),
  attributes: Joi.object().pattern(Joi.string(), Joi.string()).min(1).required(),
  price: Joi.number().min(0).required(),
  compareAtPrice: Joi.number().min(Joi.ref('price')).allow(null),
  weight: Joi.number().min(0).allow(null),
  dimensions: dimensionsSchema.default({}),
  thumbnail: thumbnailSchema.allow(null),
  isActive: Joi.boolean().default(true),
  stockQuantity: Joi.number().integer().min(0).default(0), // support optional stock count if passed
});

export const updateVariantSchema = Joi.object({
  sku: Joi.string().min(1).max(100).trim(),
  attributes: Joi.object().pattern(Joi.string(), Joi.string()).min(1),
  price: Joi.number().min(0),
  compareAtPrice: Joi.number().min(Joi.ref('price')).allow(null),
  weight: Joi.number().min(0).allow(null),
  dimensions: dimensionsSchema,
  thumbnail: thumbnailSchema.allow(null),
  isActive: Joi.boolean(),
  stockQuantity: Joi.number().integer().min(0),
});
