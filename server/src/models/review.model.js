import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      default: '',
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
      index: true,
    },
    sellerReply: {
      comment: { type: String, trim: true },
      repliedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      createdAt: { type: Date },
    },
    isHidden: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
    images: [
      {
        public_id: { type: String, required: true },
        url: { type: String, required: true },
        metadata: {
          width: Number,
          height: Number,
          bytes: Number,
          format: String,
        },
      },
    ],
    votes: {
      helpfulCount: {
        type: Number,
        default: 0,
      },
      helpfulUsers: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      ],
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

reviewSchema.index(
  { user: 1, product: 1 },
  {
    unique: true,
    partialFilterExpression: { deletedAt: null },
  }
);
reviewSchema.index({ product: 1, isHidden: 1, deletedAt: 1, createdAt: -1 });

export const Review = mongoose.model('Review', reviewSchema);

if (mongoose.connection) {
  mongoose.connection.once('open', async () => {
    try {
      const collection = mongoose.connection.db.collection('reviews');
      const indexes = await collection.indexes().catch(() => []);
      for (const index of indexes) {
        if (index.name === 'user_1_product_1' && !index.partialFilterExpression) {
          await collection.dropIndex(index.name).catch(() => {});
          console.log(`[Migration] Dropped legacy unique index: ${index.name}`);
        }
      }
    } catch (err) {
      // Fail silently if db or collection does not exist yet
    }
  });
}

