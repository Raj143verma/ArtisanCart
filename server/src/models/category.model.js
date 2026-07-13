import mongoose from 'mongoose';

const CategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, trim: true, maxlength: 200 },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    ancestors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    path: { type: String, trim: true, index: true },
    depth: { type: Number, default: 0 },
    description: { type: String, default: '' },
    banner: {
      public_id: { type: String },
      url: { type: String },
    },
    icon: {
      public_id: { type: String },
      url: { type: String },
    },
    thumbnail: {
      public_id: { type: String },
      url: { type: String },
    },
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    displayOrder: { type: Number, default: 0, index: true },
    seo: {
      title: { type: String, default: '' },
      metaDescription: { type: String, default: '' },
      keywords: [{ type: String }],
    },
    productCount: { type: Number, default: 0 },
    viewCount: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// enforce unique slug among siblings (parent + slug) for non-deleted docs
CategorySchema.index({ parent: 1, slug: 1 }, { unique: true, partialFilterExpression: { deletedAt: null } });

// text index for simple search
CategorySchema.index({ name: 'text', description: 'text', 'seo.title': 'text', 'seo.metaDescription': 'text' });

CategorySchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

export const Category = mongoose.model('Category', CategorySchema);
