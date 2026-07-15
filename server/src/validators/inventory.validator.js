import Joi from 'joi';

export const adjustInventorySchema = Joi.object({
  adjustment: Joi.number().integer().required(),
});

export const restockInventorySchema = Joi.object({
  quantity: Joi.number().integer().min(0).required(),
});

export const thresholdInventorySchema = Joi.object({
  threshold: Joi.number().integer().min(0).required(),
});
