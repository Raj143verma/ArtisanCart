import Joi from 'joi';
import { slugify } from '../utils/slugUtils.js';

const seoSchema = Joi.object({
  title: Joi.string().max(200).allow(''),
  metaDescription: Joi.string().max(320).allow(''),
  keywords: Joi.array().items(Joi.string().max(50)).max(10),
});

export const createCategorySchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  parent: Joi.string().allow(null, ''),
  description: Joi.string().max(2000).allow(''),
  displayOrder: Joi.number().integer().min(0).default(0),
  isFeatured: Joi.boolean().default(false),
  isActive: Joi.boolean().default(true),
  seo: seoSchema.default({}),
  banner: Joi.object({ public_id: Joi.string(), url: Joi.string() }).optional(),
  icon: Joi.object({ public_id: Joi.string(), url: Joi.string() }).optional(),
  thumbnail: Joi.object({ public_id: Joi.string(), url: Joi.string() }).optional(),
});

export const updateCategorySchema = Joi.object({
  name: Joi.string().min(1).max(200),
  parent: Joi.string().allow(null, ''),
  description: Joi.string().max(2000).allow(''),
  displayOrder: Joi.number().integer().min(0),
  isFeatured: Joi.boolean(),
  isActive: Joi.boolean(),
  seo: seoSchema,
  banner: Joi.object({ public_id: Joi.string(), url: Joi.string() }).optional(),
  icon: Joi.object({ public_id: Joi.string(), url: Joi.string() }).optional(),
  thumbnail: Joi.object({ public_id: Joi.string(), url: Joi.string() }).optional(),
});

export const listQuerySchema = Joi.object({
  q: Joi.string().allow(''),
  slug: Joi.string().allow(''),
  featured: Joi.boolean(),
  active: Joi.boolean(),
  parent: Joi.string().allow('', null),
  limit: Joi.number().integer().min(1).max(100).default(20),
  page: Joi.number().integer().min(1).default(1),
});
