import Joi from 'joi';

const storeIdSchema = Joi.string().hex().length(24).optional();

export const overviewQuerySchema = Joi.object({
  storeId: storeIdSchema,
});

export const ordersQuerySchema = Joi.object({
  storeId: storeIdSchema,
});

export const salesQuerySchema = Joi.object({
  storeId: storeIdSchema,
});

export const inventoryAlertsQuerySchema = Joi.object({
  type: Joi.string().valid('low_stock', 'out_of_stock').required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  storeId: storeIdSchema,
});

export const productPerformanceQuerySchema = Joi.object({
  filter: Joi.string().valid('best_selling', 'recently_added', 'never_sold').default('best_selling'),
  limit: Joi.number().integer().min(1).max(50).default(5),
  page: Joi.number().integer().min(1).default(1),
  storeId: storeIdSchema,
});

export const analyticsQuerySchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().required(),
  storeId: storeIdSchema,
  timezone: Joi.string().optional(),
});
