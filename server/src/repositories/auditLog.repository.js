import { AuditLog } from '../models/auditLog.model.js';

export const AuditLogRepository = {
  create: (payload, session = null) => {
    const options = {};
    if (session) options.session = session;
    return AuditLog.create([payload], options).then((docs) => docs[0]);
  },

  findById: (id, session = null) => {
    const query = AuditLog.findById(id).populate('actor', 'firstName lastName email');
    if (session) query.session(session);
    return query;
  },

  list: (filter = {}, limit = 20, skip = 0) => {
    return AuditLog.find(filter)
      .populate('actor', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  },

  count: (filter = {}) => {
    return AuditLog.countDocuments(filter);
  },
};
