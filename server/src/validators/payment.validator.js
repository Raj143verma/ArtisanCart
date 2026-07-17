import Joi from 'joi';

const objectIdPattern = /^[0-9a-fA-F]{24}$/;

export const initializePaymentSchema = Joi.object({
  orderIds: Joi.array()
    .items(Joi.string().regex(objectIdPattern).message('Invalid orderId format.'))
    .min(1)
    .required(),
  idempotencyKey: Joi.string().min(5).max(100).required(),
  provider: Joi.string().valid('stripe', 'razorpay', 'paypal', 'mock').default('mock'),
});

export const verifyPaymentSchema = Joi.object({
  providerSessionId: Joi.string().required(),
  status: Joi.string().valid('captured', 'failed').required(),
});
