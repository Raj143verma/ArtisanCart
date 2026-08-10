import { StoreBalance } from '../models/storeBalance.model.js';

export const StoreBalanceRepository = {
  create: (payload, session = null) => {
    const options = {};
    if (session) options.session = session;
    return StoreBalance.create([payload], options).then((docs) => docs[0]);
  },

  findByStoreId: (storeId, session = null) => {
    const query = StoreBalance.findOne({ store: storeId });
    if (session) query.session(session);
    return query;
  },

  updateById: (id, update, session = null) => {
    const options = { new: true, runValidators: true };
    if (session) options.session = session;
    return StoreBalance.findByIdAndUpdate(id, update, options);
  },
};
