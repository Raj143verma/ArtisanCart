import Joi from 'joi';

export const adminOverviewQuerySchema = Joi.object({});

export const adminCatalogQuerySchema = Joi.object({});

export const adminOrdersQuerySchema = Joi.object({});

export const adminRevenueQuerySchema = Joi.object({});

export const adminStoreQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(50).default(5),
});

export const adminAnalyticsQuerySchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
  timezone: Joi.string().optional(),
});
