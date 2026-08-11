import mongoose from 'mongoose';

const returnRequestItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    variantSku: {
      type: String,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    condition: {
      type: String,
      enum: ['new', 'opened', 'damaged'],
      required: true,
    },
  },
  {
    _id: false,
  }
);

const returnRequestSchema = new mongoose.Schema(
  {
    returnNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true,
    },
    customer: {
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
    items: [returnRequestItemSchema],
    refundAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['requested', 'approved', 'rejected', 'shipped', 'received', 'completed', 'disputed', 'cancelled'],
      default: 'requested',
      index: true,
    },
    sellerNotes: {
      type: String,
      default: '',
      trim: true,
    },
    disputeReason: {
      type: String,
      default: '',
      trim: true,
    },
    shippingLabel: {
      carrier: { type: String, default: null },
      trackingNumber: { type: String, default: null },
      trackingUrl: { type: String, default: null },
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

returnRequestSchema.index({ order: 1, customer: 1 });

export const ReturnRequest = mongoose.model('ReturnRequest', returnRequestSchema);
