import Joi from 'joi';

const mediaSchema = Joi.object({
  url: Joi.string().uri().required(),
  public_id: Joi.string().required(),
});

const socialLinksSchema = Joi.object({
  website: Joi.string().uri().allow(''),
  facebook: Joi.string().uri().allow(''),
  instagram: Joi.string().uri().allow(''),
  twitter: Joi.string().uri().allow(''),
  pinterest: Joi.string().uri().allow(''),
});

export const createStoreSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(2000).allow(''),
  logo: mediaSchema.allow(null),
  banner: mediaSchema.allow(null),
  contactNumber: Joi.string().max(20).allow(''),
  email: Joi.string().email().allow(''),
  businessAddress: Joi.string().max(500).allow(''),
  socialLinks: socialLinksSchema.default({}),
  gstNumber: Joi.string().max(50).allow(''),
});

export const updateStoreSchema = Joi.object({
  name: Joi.string().min(3).max(100),
  description: Joi.string().max(2000).allow(''),
  logo: mediaSchema.allow(null),
  banner: mediaSchema.allow(null),
  contactNumber: Joi.string().max(20).allow(''),
  email: Joi.string().email().allow(''),
  businessAddress: Joi.string().max(500).allow(''),
  socialLinks: socialLinksSchema,
  gstNumber: Joi.string().max(50).allow(''),
});

export const listStoresQuerySchema = Joi.object({
  q: Joi.string().allow(''),
  status: Joi.string().valid('draft', 'pending_approval', 'active', 'suspended', 'rejected'),
  limit: Joi.number().integer().min(1).max(100).default(20),
  page: Joi.number().integer().min(1).default(1),
  sort: Joi.string().valid('newest', 'oldest', 'name_asc', 'name_desc').default('newest'),
});

export const rejectStoreSchema = Joi.object({
  reason: Joi.string().min(5).max(500).required(),
});
