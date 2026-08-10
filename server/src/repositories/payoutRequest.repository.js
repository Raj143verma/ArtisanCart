import { PayoutRequest } from '../models/payoutRequest.model.js';

export const PayoutRequestRepository = {
  create: (payload, session = null) => {
    const options = {};
    if (session) options.session = session;
    return PayoutRequest.create([payload], options).then((docs) => docs[0]);
  },

  findById: (id, session = null) => {
    const query = PayoutRequest.findById(id);
    if (session) query.session(session);
    return query;
  },

  findBySellerId: (sellerId, limit = 20, skip = 0) => {
    return PayoutRequest.find({ seller: sellerId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  },

  countBySellerId: (sellerId) => {
    return PayoutRequest.countDocuments({ seller: sellerId });
  },

  listAll: (filter = {}, limit = 20, skip = 0) => {
    return PayoutRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('store');
  },

  countAll: (filter = {}) => {
    return PayoutRequest.countDocuments(filter);
  },

  updateStatusAtomic: (id, allowedCurrentStatuses, targetStatus, updateFields = {}, session = null) => {
    const options = { new: true, runValidators: true };
    if (session) options.session = session;
    return PayoutRequest.findOneAndUpdate(
      { _id: id, status: { $in: allowedCurrentStatuses } },
      { $set: { status: targetStatus, ...updateFields } },
      options
    );
  },
};
