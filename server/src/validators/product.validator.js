import Joi from 'joi';

const seoSchema = Joi.object({
  title: Joi.string().max(200).allow(''),
  metaDescription: Joi.string().max(320).allow(''),
  keywords: Joi.array().items(Joi.string().max(50)).max(10),
});

export const createProductSchema = Joi.object({
  title: Joi.string().min(1).max(200).required(),
  description: Joi.string().max(5000).allow(''),
  category: Joi.string().hex().length(24),
  categories: Joi.array().items(Joi.string().hex().length(24)).min(1),
  basePrice: Joi.number().min(0).required(),
  currency: Joi.string().uppercase().length(3).default('USD'),
  status: Joi.string().valid('draft', 'pending_review', 'published', 'rejected', 'archived', 'out_of_stock').default('draft'),
  tags: Joi.array().items(Joi.string().max(50)).max(20).default([]),
  seo: seoSchema.default({}),
  isActive: Joi.boolean().default(true),
  isFeatured: Joi.boolean().default(false),
}).xor('category', 'categories'); // either category (single) or categories (array) must be provided

export const updateProductSchema = Joi.object({
  title: Joi.string().min(1).max(200),
  description: Joi.string().max(5000).allow(''),
  category: Joi.string().hex().length(24).allow(null),
  categories: Joi.array().items(Joi.string().hex().length(24)).min(1),
  basePrice: Joi.number().min(0),
  currency: Joi.string().uppercase().length(3),
  status: Joi.string().valid('draft', 'pending_review', 'published', 'rejected', 'archived', 'out_of_stock'),
  tags: Joi.array().items(Joi.string().max(50)).max(20),
  seo: seoSchema,
  isActive: Joi.boolean(),
  isFeatured: Joi.boolean(),
});

export const listProductQuerySchema = Joi.object({
  q: Joi.string().allow(''),
  slug: Joi.string().allow(''),
  featured: Joi.boolean(),
  active: Joi.boolean(),
  status: Joi.string().valid('draft', 'pending_review', 'published', 'rejected', 'archived', 'out_of_stock'),
  category: Joi.string().hex().length(24).allow(''),
  store: Joi.string().hex().length(24).allow(''),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  tags: Joi.string().allow(''), // comma-separated or single tag
  limit: Joi.number().integer().min(1).max(100).default(20),
  page: Joi.number().integer().min(1).default(1),
  sort: Joi.string().valid('newest', 'oldest', 'price_asc', 'price_desc', 'featured').default('newest'),
});
