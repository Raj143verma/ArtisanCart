import mongoose from 'mongoose';
import { StoreKYC } from '../models/storeKYC.model.js';
import { StoreKYCRepository } from '../repositories/storeKYC.repository.js';
import { Store } from '../models/store.model.js';
import { encrypt, decrypt } from '../utils/cryptoUtils.js';
import { NotificationService } from './notification.service.js';
import { ApiError } from '../utils/ApiError.js';
import { Roles } from '../constants/roles.js';
import { AuditLogService } from './auditLog.service.js';

export const StoreKYCService = {
  // 1. Submit KYC & Bank Details (Seller)
  submitKYC: async (sellerId, payload) => {
    const {
      legalBusinessName,
      taxId,
      bankName,
      accountHolderName,
      routingNumber,
      accountNumber,
    } = payload;

    const store = await Store.findOne({ owner: sellerId, deletedAt: null });
    if (!store) {
      throw new ApiError(404, 'Store not found. You must create a store before submitting KYC.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      let kyc = await StoreKYC.findOne({ store: store._id }).session(session);

      const taxCrypto = encrypt(taxId);
      const routingCrypto = encrypt(routingNumber);
      const accountCrypto = encrypt(accountNumber);
      const lastFourDigits = accountNumber.slice(-4);

      let statusToSet = 'pending';

      if (kyc) {
        // If currently verified, check if critical values changed to decide status reset
        if (kyc.verificationStatus === 'verified') {
          const oldTaxId = decrypt(kyc.taxIdEncrypted, kyc.taxIdIv);
          const oldRouting = decrypt(kyc.bankDetails.routingNumberEncrypted, kyc.bankDetails.routingNumberIv);
          const oldAccount = decrypt(kyc.bankDetails.accountNumberEncrypted, kyc.bankDetails.accountNumberIv);

          if (
            oldTaxId === taxId &&
            oldRouting === routingNumber &&
            oldAccount === accountNumber &&
            kyc.legalBusinessName === legalBusinessName &&
            kyc.bankDetails.bankName === bankName &&
            kyc.bankDetails.accountHolderName === accountHolderName
          ) {
            statusToSet = 'verified'; // No changes to critical fields, keep verified status
          }
        }

        kyc.legalBusinessName = legalBusinessName;
        kyc.taxIdEncrypted = taxCrypto.encrypted;
        kyc.taxIdIv = taxCrypto.iv;
        kyc.verificationStatus = statusToSet;
        kyc.rejectionReason = '';
        kyc.bankDetails = {
          bankName,
          accountHolderName,
          routingNumberEncrypted: routingCrypto.encrypted,
          routingNumberIv: routingCrypto.iv,
          accountNumberEncrypted: accountCrypto.encrypted,
          accountNumberIv: accountCrypto.iv,
          lastFourDigits,
        };

        await kyc.save({ session });
      } else {
        kyc = await StoreKYCRepository.create(
          {
            store: store._id,
            seller: sellerId,
            legalBusinessName,
            taxIdEncrypted: taxCrypto.encrypted,
            taxIdIv: taxCrypto.iv,
            verificationStatus: 'pending',
            bankDetails: {
              bankName,
              accountHolderName,
              routingNumberEncrypted: routingCrypto.encrypted,
              routingNumberIv: routingCrypto.iv,
              accountNumberEncrypted: accountCrypto.encrypted,
              accountNumberIv: accountCrypto.iv,
              lastFourDigits,
            },
          },
          session
        );
      }

      await session.commitTransaction();
      return kyc;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },

  // 2. Retrieve KYC Profile (Seller sees own profile, Admin sees target profile)
  getKYCProfile: async (userId, userRole, querySellerId = null) => {
    let targetSellerId = userId;
    if (userRole === Roles.SUPER_ADMIN && querySellerId) {
      targetSellerId = querySellerId;
    }

    const kyc = await StoreKYC.findOne({ seller: targetSellerId }).populate('store');
    if (!kyc) {
      return { verificationStatus: 'unsubmitted' };
    }
    return kyc;
  },

  // 3. Review KYC & Bank Details (Admin)
  reviewKYC: async (adminId, adminRole, kycId, { status, rejectionReason }, reqContext = null) => {
    if (adminRole !== Roles.SUPER_ADMIN) {
      throw new ApiError(403, 'Only super administrators can review KYC submissions.');
    }

    if (!['verified', 'rejected'].includes(status)) {
      throw new ApiError(400, 'Invalid target review status.');
    }

    const kyc = await StoreKYCRepository.findById(kycId);
    if (!kyc) {
      throw new ApiError(404, 'KYC submission profile not found.');
    }

    const before = kyc.toObject();

    if (status === 'rejected' && !rejectionReason) {
      throw new ApiError(400, 'Rejection reason is required.');
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const updateFields = {
        verifiedAt: status === 'verified' ? new Date() : null,
        verifiedBy: status === 'verified' ? adminId : null,
        rejectionReason: status === 'rejected' ? rejectionReason : '',
      };

      const updated = await StoreKYCRepository.updateStatusAtomic(
        kycId,
        ['pending'],
        status,
        updateFields,
        session
      );

      if (!updated) {
        throw new ApiError(400, 'Cannot review KYC. Profile is not in pending status.');
      }

      // Notify seller of decision
      const title = status === 'verified' ? 'KYC Verification Approved' : 'KYC Verification Rejected';
      const message = status === 'verified'
        ? 'Congratulations! Your legal entity details and payout bank details have been verified.'
        : `Your KYC profile submission was rejected. Reason: ${rejectionReason}`;

      await NotificationService.sendNotification(
        kyc.seller,
        {
          type: 'system',
          title,
          message,
          metadata: { kycId: kyc._id, status },
        },
        session
      );

      const after = updated.toObject();
      await AuditLogService.logAction(
        reqContext || adminId,
        `kyc.${status}`,
        'StoreKYC',
        kyc._id,
        { before, after },
        {},
        session
      );

      await session.commitTransaction();
      return updated;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  },
};
