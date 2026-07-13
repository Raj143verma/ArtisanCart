import { createErrorResponse } from '../helpers/responseHelper.js';

export function notFound(req, res) {
  res.status(404).json(createErrorResponse('Resource not found'));
}
