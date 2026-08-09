import Joi from 'joi';

export const listNotificationsSchema = Joi.object({
  isRead: Joi.boolean().optional(),
  type: Joi.string().valid('order', 'promotion', 'system', 'message').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});
