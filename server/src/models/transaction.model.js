import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    transactionNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
      },
    ],
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true,
    },
    provider: {
      type: String,
      enum: ['stripe', 'razorpay', 'paypal', 'mock'],
      default: 'mock',
      required: true,
    },
    providerSessionId: {
      type: String,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['created', 'pending', 'authorized', 'captured', 'failed', 'cancelled'],
      default: 'created',
      index: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export const Transaction = mongoose.model('Transaction', transactionSchema);
