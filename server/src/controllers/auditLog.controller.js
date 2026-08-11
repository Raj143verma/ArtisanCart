import { asyncHandler } from '../utils/asyncHandler.js';
import { AuditLogRepository } from '../repositories/auditLog.repository.js';
import { createSuccessResponse } from '../helpers/responseHelper.js';
import { Roles } from '../constants/roles.js';
import { ApiError } from '../utils/ApiError.js';

export const listAuditLogs = asyncHandler(async (req, res) => {
  if (req.user.role !== Roles.SUPER_ADMIN) {
    throw new ApiError(403, 'Unauthorized access to security audit trails.');
  }

  const { limit, skip, action, actorId, targetId, targetModel } = req.query;
  const parsedLimit = limit ? Number(limit) : 20;
  const parsedSkip = skip ? Number(skip) : 0;

  const filter = {};
  if (action) filter.action = action;
  if (actorId) filter.actor = actorId;
  if (targetId) filter.targetId = targetId;
  if (targetModel) filter.targetModel = targetModel;

  const logs = await AuditLogRepository.list(filter, parsedLimit, parsedSkip);
  const total = await AuditLogRepository.count(filter);

  return res.json(createSuccessResponse({ logs, total }, 'Audit logs list retrieved successfully.'));
});

export const getAuditLogById = asyncHandler(async (req, res) => {
  if (req.user.role !== Roles.SUPER_ADMIN) {
    throw new ApiError(403, 'Unauthorized access.');
  }

  const { id } = req.params;
  const log = await AuditLogRepository.findById(id);
  if (!log) {
    throw new ApiError(404, 'Audit log record not found.');
  }

  return res.json(createSuccessResponse(log, 'Audit log details retrieved successfully.'));
});
