export const emailConfig = {
  host: process.env.EMAIL_HOST || '',
  port: Number(process.env.EMAIL_PORT || 587),
  user: process.env.EMAIL_USER || '',
  pass: process.env.EMAIL_PASS || '',
  fromAddress: process.env.EMAIL_FROM || 'no-reply@artisan-cart.local',
};
