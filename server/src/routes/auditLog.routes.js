import express from 'express';
import * as controller from '../controllers/auditLog.controller.js';
import { authMiddleware } from '../middleware/auth/authMiddleware.js';
import { roleMiddleware } from '../middleware/auth/roleMiddleware.js';
import { validateQuery } from '../validators/validator.js';
import { listAuditLogsQuerySchema } from '../validators/auditLog.validator.js';
import { Roles } from '../constants/roles.js';

const router = express.Router();

// All audit log routes require Super Admin permissions
router.use(authMiddleware);
router.use(roleMiddleware(Roles.SUPER_ADMIN));

router.get(
  '/',
  validateQuery(listAuditLogsQuerySchema),
  controller.listAuditLogs
);

router.get(
  '/:id',
  controller.getAuditLogById
);

export default router;
