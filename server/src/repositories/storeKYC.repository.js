import { StoreKYC } from '../models/storeKYC.model.js';

export const StoreKYCRepository = {
  create: (payload, session = null) => {
    const options = {};
    if (session) options.session = session;
    return StoreKYC.create([payload], options).then((docs) => docs[0]);
  },

  findById: (id, session = null) => {
    const query = StoreKYC.findById(id);
    if (session) query.session(session);
    return query;
  },

  findByStoreId: (storeId, session = null) => {
    const query = StoreKYC.findOne({ store: storeId });
    if (session) query.session(session);
    return query;
  },

  findBySellerId: (sellerId, session = null) => {
    const query = StoreKYC.findOne({ seller: sellerId });
    if (session) query.session(session);
    return query;
  },

  list: (filter = {}, limit = 20, skip = 0) => {
    return StoreKYC.find(filter)
      .populate('store')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  },

  count: (filter = {}) => {
    return StoreKYC.countDocuments(filter);
  },

  updateStatusAtomic: (id, allowedCurrentStatuses, targetStatus, updateFields = {}, session = null) => {
    const options = { new: true, runValidators: true };
    if (session) options.session = session;
    return StoreKYC.findOneAndUpdate(
      { _id: id, verificationStatus: { $in: allowedCurrentStatuses } },
      { $set: { verificationStatus: targetStatus, ...updateFields } },
      options
    );
  },
};
