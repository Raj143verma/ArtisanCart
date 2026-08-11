import mongoose from 'mongoose';

const refundTransactionSchema = new mongoose.Schema(
  {
    refundNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    originalTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      required: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'succeeded', 'failed'],
      default: 'pending',
      index: true,
    },
    providerRefundId: {
      type: String,
      default: null,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

refundTransactionSchema.index({ originalTransaction: 1 });

export const RefundTransaction = mongoose.model('RefundTransaction', refundTransactionSchema);
