import Joi from 'joi';

const addressSchema = Joi.object({
  fullName: Joi.string().required(),
  phone: Joi.string().required(),
  addressLine1: Joi.string().required(),
  addressLine2: Joi.string().allow('', null).default(''),
  city: Joi.string().required(),
  state: Joi.string().required(),
  postalCode: Joi.string().required(),
  country: Joi.string().required(),
});

export const initCheckoutSchema = Joi.object({
  shippingAddress: addressSchema.required(),
  billingAddress: addressSchema.allow(null).default(null),
});
