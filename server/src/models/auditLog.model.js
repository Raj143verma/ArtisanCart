import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorEmail: {
      type: String,
      required: true,
      trim: true,
    },
    actorRole: {
      type: String,
      required: true,
    },
    action: {
      type: String, // e.g. 'kyc.approve', 'payout.process', 'store.suspend', 'dispute.resolve'
      required: true,
      index: true,
    },
    targetModel: {
      type: String, // e.g. 'StoreKYC', 'PayoutRequest', 'Store', 'ReturnRequest'
      required: true,
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    changes: {
      before: { type: mongoose.Schema.Types.Mixed, default: null },
      after: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    requestId: { type: String, default: null },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    // Append-only logs: no updatedAt field is created
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Define compound and query indexes
auditLogSchema.index({ actor: 1, action: 1 });
auditLogSchema.index({ targetModel: 1, targetId: 1 });
auditLogSchema.index({ createdAt: -1 });

// Helper to block updates/deletes and throw validation error
const preventWrite = (next) => next(new Error('Audit logs are immutable append-only records and cannot be modified.'));
const preventDelete = (next) => next(new Error('Audit logs are immutable append-only records and cannot be deleted.'));

// Register hooks
auditLogSchema.pre('save', function (next) {
  if (!this.isNew) return preventWrite(next);
  next();
});

auditLogSchema.pre('updateOne', preventWrite);
auditLogSchema.pre('findOneAndUpdate', preventWrite);
auditLogSchema.pre('updateMany', preventWrite);
auditLogSchema.pre('deleteOne', preventDelete);
auditLogSchema.pre('deleteMany', preventDelete);
auditLogSchema.pre('findOneAndDelete', preventDelete);

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
