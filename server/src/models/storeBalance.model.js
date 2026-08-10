import mongoose from 'mongoose';

const storeBalanceSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      unique: true,
      index: true,
    },
    availableBalance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    pendingBalance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    withdrawnTotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const StoreBalance = mongoose.model('StoreBalance', storeBalanceSchema);
