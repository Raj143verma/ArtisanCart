import { randomUUID } from 'node:crypto';

export function requestId(req, res, next) {
  try {
    const id = (typeof randomUUID === 'function') ? randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    req.requestId = id;
    res.setHeader('X-Request-ID', id);
    next();
  } catch (err) {
    next();
  }
}
