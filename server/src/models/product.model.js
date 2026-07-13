import mongoose from 'mongoose';

const productImageSchema = new mongoose.Schema({
  public_id: { type: String, required: true },
  url: { type: String, required: true },
  isThumbnail: { type: Boolean, default: false },
  displayOrder: { type: Number, default: 0 },
  metadata: {
    width: Number,
    height: Number,
    bytes: Number,
    format: String,
  }
});

const productSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      index: true,
    },
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
      },
    ],
    title: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    basePrice: {
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
    images: {
      type: [productImageSchema],
      default: [],
    },
    stockQuantity: {
      type: Number,
      default: 0,
      min: 0,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'pending_review', 'published', 'rejected', 'archived', 'out_of_stock'],
      default: 'draft',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    seo: {
      title: { type: String, max: 200, default: '' },
      metaDescription: { type: String, max: 320, default: '' },
      keywords: { type: [String], default: [] },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    hasVariants: {
      type: Boolean,
      default: false,
      index: true,
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

productSchema.virtual('price').get(function () {
  return this.basePrice;
});

productSchema.index({ title: 'text', description: 'text', tags: 'text' });

export const Product = mongoose.model('Product', productSchema);
