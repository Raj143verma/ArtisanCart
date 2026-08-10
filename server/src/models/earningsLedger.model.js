import mongoose from 'mongoose';

const earningsLedgerSchema = new mongoose.Schema(
  {
    ledgerNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true,
    },
    transactionType: {
      type: String,
      enum: ['sale_pending', 'sale_cleared', 'commission', 'payout_hold', 'payout_complete', 'payout_refund', 'adjustment'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    availableBalanceSnapshot: {
      type: Number,
      required: true,
    },
    pendingBalanceSnapshot: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for ledger queries and sorting
earningsLedgerSchema.index({ store: 1, createdAt: -1 });
earningsLedgerSchema.index(
  { order: 1, transactionType: 1 },
  { unique: true, partialFilterExpression: { order: { $exists: true, $ne: null } } }
);

export const EarningsLedger = mongoose.model('EarningsLedger', earningsLedgerSchema);
