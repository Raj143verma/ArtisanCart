import { AuditLogRepository } from '../repositories/auditLog.repository.js';

function maskPIIDetails(changes) {
  if (!changes) return null;
  
  // Clone to avoid side effects
  const masked = JSON.parse(JSON.stringify(changes));

  const maskKeys = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    
    const sensitiveKeys = [
      'taxId',
      'taxIdEncrypted',
      'taxIdIv',
      'accountNumber',
      'accountNumberEncrypted',
      'accountNumberIv',
      'routingNumber',
      'routingNumberEncrypted',
      'routingNumberIv',
      'password',
    ];

    for (const key of Object.keys(obj)) {
      if (sensitiveKeys.includes(key)) {
        obj[key] = '[MASKED]';
      } else if (typeof obj[key] === 'object') {
        maskKeys(obj[key]);
      }
    }
  };

  if (masked.before) maskKeys(masked.before);
  if (masked.after) maskKeys(masked.after);

  return masked;
}

export const AuditLogService = {
  logAction: async (reqOrUser, action, targetModel, targetId, changes = null, metadata = {}, session = null) => {
    let actor = null;
    let actorEmail = 'system@artisiancart.internal';
    let actorRole = 'system';
    let ipAddress = null;
    let userAgent = null;
    let requestId = null;

    if (reqOrUser) {
      if (reqOrUser.user) {
        // It is an Express request object containing user context
        actor = reqOrUser.user._id;
        actorEmail = reqOrUser.user.email;
        actorRole = reqOrUser.user.role;
        ipAddress = reqOrUser.ip || reqOrUser.headers?.['x-forwarded-for'] || null;
        userAgent = reqOrUser.headers?.['user-agent'] || null;
        requestId = reqOrUser.requestId || null;
      } else if (reqOrUser._id) {
        // It is a User model document
        actor = reqOrUser._id;
        actorEmail = reqOrUser.email;
        actorRole = reqOrUser.role;
      }
    }

    const cleanChanges = maskPIIDetails(changes);

    try {
      const log = await AuditLogRepository.create(
        {
          actor,
          actorEmail,
          actorRole,
          action,
          targetModel,
          targetId,
          changes: cleanChanges,
          ipAddress,
          userAgent,
          requestId,
          metadata,
        },
        session
      );
      return log;
    } catch (err) {
      // In compliance environments we log locally, but do not throw to block main transaction logic
      console.error('[AuditLog Service Error] Failed to write log:', err.message);
      return null;
    }
  },
};
