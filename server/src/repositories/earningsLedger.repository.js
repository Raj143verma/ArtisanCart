import { EarningsLedger } from '../models/earningsLedger.model.js';

export const EarningsLedgerRepository = {
  create: (payload, session = null) => {
    const options = {};
    if (session) options.session = session;
    return EarningsLedger.create([payload], options).then((docs) => docs[0]);
  },

  findByStoreId: (storeId, limit = 20, skip = 0) => {
    return EarningsLedger.find({ store: storeId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  },

  countByStoreId: (storeId) => {
    return EarningsLedger.countDocuments({ store: storeId });
  },
};
