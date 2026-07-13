export function validateDatabaseEnv(env) {
  // In production we require explicit environment variables.
  // For development/local runs, config defaults are available in src/config/index.js.
  const isProd = env.NODE_ENV === 'production';
  const errors = [];

  if (isProd && !env.MONGODB_URI) {
    errors.push('MONGODB_URI is required');
  }

  if (isProd && !env.NODE_ENV) {
    errors.push('NODE_ENV is required');
  }

  if (errors.length > 0) {
    const message = `Environment validation failed: ${errors.join('; ')}`;
    throw new Error(message);
  }
}
