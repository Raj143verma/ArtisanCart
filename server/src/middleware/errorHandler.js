import { createErrorResponse } from '../helpers/responseHelper.js';
import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, next) {
  let status = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || null;

  // Handle Mongoose CastError (invalid ObjectId format)
  if (err.name === 'CastError') {
    status = 400;
    message = 'Validation failed: Invalid format for ID.';
    errors = [{ field: err.path, message: 'Invalid identifier format.' }];
  } else if (err.code === 11000) {
    status = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : 'value';
    message = `Validation failed: Duplicate value error.`;
    errors = [{ field, message: `The ${field} '${value}' is already taken.` }];
  }

  logger.error('Unhandled error', { message: err.message, stack: err.stack, path: req.originalUrl });

  res.status(status).json(
    createErrorResponse(message, errors),
  );
}
