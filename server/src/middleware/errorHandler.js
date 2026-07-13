import { createErrorResponse } from '../helpers/responseHelper.js';
import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  const status = err.statusCode || err.status || 500;
  logger.error('Unhandled error', { message: err.message, stack: err.stack, path: req.originalUrl });

  res.status(status).json(
    createErrorResponse(err.message || 'Internal Server Error', err.errors || null),
  );
}
