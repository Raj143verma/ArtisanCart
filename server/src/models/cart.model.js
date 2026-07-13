import mongoose from 'mongoose';

const cartItemSchema = new mongoose.Schema(
  {
    productVariant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductVariant',
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    selectedOptions: {
      type: Map,
      of: String,
      default: {},
    },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

cartSchema.index({ user: 1 }, { unique: true });

export const Cart = mongoose.model('Cart', cartSchema);
