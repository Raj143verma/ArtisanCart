import mongoose from 'mongoose';
import { calculateInventoryStatus } from '../helpers/inventoryHelper.js';

const inventorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductVariant',
      required: true,
      unique: true,
      index: true,
    },
    available: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    lowStockThreshold: {
      type: Number,
      required: true,
      min: 0,
      default: 5,
    },
    status: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock'],
      default: 'out_of_stock',
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Pre-save hook to calculate status dynamically based on available stock using the reusable helper
inventorySchema.pre('save', function (next) {
  this.status = calculateInventoryStatus(this.available, this.lowStockThreshold);
  next();
});

export const Inventory = mongoose.model('Inventory', inventorySchema);
