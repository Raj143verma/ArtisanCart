import Joi from 'joi';

const passwordRules = Joi.string()
  .min(8)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)
  .message('Password must contain uppercase, lowercase, number, and special character')
  .required();

export const registerSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: passwordRules,
  firstName: Joi.string().trim().required(),
  lastName: Joi.string().trim().required(),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().required(),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: passwordRules,
});

export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: passwordRules,
});
