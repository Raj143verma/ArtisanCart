import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    postalCode: { type: String, required: true },
    country: { type: String, required: true },
  },
  {
    _id: false,
  },
);

const checkoutItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProductVariant',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    priceSnapshot: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const checkoutSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    cart: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cart',
      required: true,
    },
    items: [checkoutItemSchema],
    shippingAddress: addressSchema,
    billingAddress: addressSchema,
    pricing: {
      subtotal: { type: Number, required: true, default: 0 },
      shippingFee: { type: Number, required: true, default: 0 },
      tax: { type: Number, required: true, default: 0 },
      total: { type: Number, required: true, default: 0 },
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed'],
      default: 'pending',
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'expired', 'cancelled'],
      default: 'active',
      index: true,
    },
    paymentIntentId: {
      type: String,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Database-level partial unique index to guarantee only one active checkout session per user
checkoutSessionSchema.index(
  { user: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

export const CheckoutSession = mongoose.model('CheckoutSession', checkoutSessionSchema);
