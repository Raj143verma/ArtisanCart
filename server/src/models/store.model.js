import mongoose from 'mongoose';

const storeSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    // logo structure to support rich media
    logo: {
      url: { type: String, default: '' },
      public_id: { type: String, default: null },
    },
    // banner structure to support rich media
    banner: {
      url: { type: String, default: '' },
      public_id: { type: String, default: null },
    },
    // Backwards-compatible fields (synced via pre-save hooks)
    logoUrl: {
      type: String,
      default: '',
    },
    coverImageUrl: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: '',
      trim: true,
    },
    // New profile fields
    businessAddress: {
      type: String,
      default: '',
      trim: true,
    },
    contactNumber: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: '',
    },
    socialLinks: {
      website: { type: String, default: '' },
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      twitter: { type: String, default: '' },
      pinterest: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'active', 'suspended', 'rejected'],
      default: 'draft',
      index: true,
    },
    isApproved: {
      type: Boolean,
      default: false,
      index: true,
    },
    gstNumber: {
      type: String,
      trim: true,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    deletedAt: {
      type: Date,
      default: null,
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

// Define partial unique indexes (so soft deleted stores don't cause duplicate key errors)
storeSchema.index(
  { owner: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);
storeSchema.index(
  { name: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);
storeSchema.index(
  { slug: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } }
);

// Text index for search
storeSchema.index({ name: 'text', description: 'text' });

// Pre-save hook to keep backward compatibility fields in sync
storeSchema.pre('save', function (next) {
  if (this.logo && this.logo.url) {
    this.logoUrl = this.logo.url;
  }
  if (this.banner && this.banner.url) {
    this.coverImageUrl = this.banner.url;
  }
  
  if (this.businessAddress) {
    this.location = this.businessAddress;
  } else if (this.location) {
    this.businessAddress = this.location;
  }

  // Keep isApproved in sync with active status
  this.isApproved = this.status === 'active';

  next();
});

export const Store = mongoose.model('Store', storeSchema);

if (mongoose.connection) {
  mongoose.connection.once('open', async () => {
    try {
      const collection = mongoose.connection.db.collection('stores');
      const indexes = await collection.indexes().catch(() => []);
      for (const index of indexes) {
        if (
          (index.name === 'name_1' || index.name === 'slug_1' || index.name === 'owner_1') &&
          !index.partialFilterExpression
        ) {
          await collection.dropIndex(index.name).catch(() => {});
          console.log(`[Migration] Dropped legacy unique index: ${index.name}`);
        }
      }
    } catch (err) {
      // Fail silently if db or collection does not exist yet
    }
  });
}

