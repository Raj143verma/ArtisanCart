import { randomUUID } from 'node:crypto';
import { appConstants } from '../constants/appConstants.js';

export function requestId(req, res, next) {
  const requestId = req.headers[appConstants.requestIdHeader] || randomUUID();
  req.id = requestId;
  res.setHeader(appConstants.requestIdHeader, requestId);
  next();
}
