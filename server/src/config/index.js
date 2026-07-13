import dotenv from 'dotenv';

dotenv.config();

export const appConfig = {
  port: Number(process.env.PORT || 4000),
  env: process.env.NODE_ENV || 'development',
};

export const dbConfig = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/artisan-cart',
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
};

export const securityConfig = {
  cookieSecret: process.env.COOKIE_SECRET || 'change-this-secret',
};

export const mailConfig = {
  host: process.env.EMAIL_HOST || '',
  port: Number(process.env.EMAIL_PORT || 587),
  user: process.env.EMAIL_USER || '',
  pass: process.env.EMAIL_PASS || '',
  fromAddress: process.env.EMAIL_FROM || 'no-reply@artisan-cart.local',
};

export const cloudinaryConfig = {
  cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  apiKey: process.env.CLOUDINARY_API_KEY || '',
  apiSecret: process.env.CLOUDINARY_API_SECRET || '',
};

export default {
  ...appConfig,
  ...dbConfig,
  ...securityConfig,
  ...mailConfig,
  ...cloudinaryConfig,
};
