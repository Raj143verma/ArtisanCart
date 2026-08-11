import { RefundTransaction } from '../models/refundTransaction.model.js';

export const RefundTransactionRepository = {
  create: (payload, session = null) => {
    const options = {};
    if (session) options.session = session;
    return RefundTransaction.create([payload], options).then((docs) => docs[0]);
  },

  findById: (id) => RefundTransaction.findById(id),

  findByOriginalTransaction: (originalTxId) => RefundTransaction.findOne({ originalTransaction: originalTxId }),
};
