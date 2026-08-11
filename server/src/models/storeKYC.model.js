import mongoose from 'mongoose';

const bankDetailsSchema = new mongoose.Schema(
  {
    bankName: {
      type: String,
      required: true,
      trim: true,
    },
    accountHolderName: {
      type: String,
      required: true,
      trim: true,
    },
    routingNumberEncrypted: {
      type: String,
      required: true,
    },
    routingNumberIv: {
      type: String,
      required: true,
    },
    accountNumberEncrypted: {
      type: String,
      required: true,
    },
    accountNumberIv: {
      type: String,
      required: true,
    },
    lastFourDigits: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const storeKYCSchema = new mongoose.Schema(
  {
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Store',
      required: true,
      unique: true,
      index: true,
    },
    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    legalBusinessName: {
      type: String,
      required: true,
      trim: true,
    },
    taxIdEncrypted: {
      type: String,
      required: true,
    },
    taxIdIv: {
      type: String,
      required: true,
    },
    verificationStatus: {
      type: String,
      enum: ['unsubmitted', 'pending', 'verified', 'rejected'],
      default: 'unsubmitted',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    bankDetails: {
      type: bankDetailsSchema,
      required: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to verify KYC ownership by store and seller
storeKYCSchema.index({ store: 1, seller: 1 }, { unique: true });

// Transform serialization to automatically strip encrypted fields and IVs
storeKYCSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.taxIdEncrypted;
    delete ret.taxIdIv;
    if (ret.bankDetails) {
      delete ret.bankDetails.accountNumberEncrypted;
      delete ret.bankDetails.accountNumberIv;
      delete ret.bankDetails.routingNumberEncrypted;
      delete ret.bankDetails.routingNumberIv;
    }
    return ret;
  },
});

export const StoreKYC = mongoose.model('StoreKYC', storeKYCSchema);
