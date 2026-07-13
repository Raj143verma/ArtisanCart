import mongoose from 'mongoose';

const customOrderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    requestedDeliveryDate: {
      type: Date,
    },
    budget: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ['requested', 'quoted', 'approved', 'in_progress', 'completed', 'cancelled'],
      default: 'requested',
      index: true,
    },
    attachments: {
      type: [String],
      default: [],
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

export const CustomOrder = mongoose.model('CustomOrder', customOrderSchema);
