import Joi from 'joi';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const listAuditLogsQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  skip: Joi.number().integer().min(0).default(0),
  action: Joi.string().trim().allow('', null),
  actorId: Joi.string().regex(objectIdPattern).allow('', null),
  targetId: Joi.string().regex(objectIdPattern).allow('', null),
  targetModel: Joi.string().trim().allow('', null),
});
