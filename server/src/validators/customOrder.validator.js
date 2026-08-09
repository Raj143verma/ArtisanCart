import Joi from 'joi';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createCustomOrderSchema = Joi.object({
  storeId: Joi.string().pattern(objectIdRegex).required().messages({
    'string.pattern.base': 'Invalid storeId format.',
  }),
  title: Joi.string().trim().min(3).max(100).required(),
  description: Joi.string().trim().min(10).max(2000).required(),
  requestedDeliveryDate: Joi.date().iso().greater('now').optional(),
  budget: Joi.number().positive().min(0.01).required(),
  attachments: Joi.array().items(Joi.string().uri()).optional().default([]),
});

export const submitQuoteSchema = Joi.object({
  budget: Joi.number().positive().min(0.01).required(),
});

export const listCustomOrdersSchema = Joi.object({
  status: Joi.string()
    .valid('requested', 'quoted', 'approved', 'in_progress', 'completed', 'cancelled')
    .optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});
