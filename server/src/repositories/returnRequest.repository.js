import { ReturnRequest } from '../models/returnRequest.model.js';

export const ReturnRequestRepository = {
  create: (payload, session = null) => {
    const options = {};
    if (session) options.session = session;
    return ReturnRequest.create([payload], options).then((docs) => docs[0]);
  },

  findById: (id, session = null) => {
    const query = ReturnRequest.findById(id);
    if (session) query.session(session);
    return query;
  },

  list: (filter = {}, limit = 20, skip = 0) => {
    return ReturnRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  },

  count: (filter = {}) => {
    return ReturnRequest.countDocuments(filter);
  },

  updateStatusAtomic: (id, allowedCurrentStatuses, targetStatus, updateFields = {}, session = null) => {
    const options = { new: true, runValidators: true };
    if (session) options.session = session;
    return ReturnRequest.findOneAndUpdate(
      { _id: id, status: { $in: allowedCurrentStatuses } },
      { $set: { status: targetStatus, ...updateFields } },
      options
    );
  },
};
