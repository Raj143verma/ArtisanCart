import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: './.env' });

async function runTests() {
  console.log('--- STARTING SELLER KYC & PAYOUT ONBOARDING INTEGRATION TESTS ---');
  await mongoose.connect('mongodb://127.0.0.1:27017/ArtisianCartTest?retryWrites=false');
  console.log('Connected to Database.');

  // Detect transaction support
  let transactionsSupported = true;
  const topology = mongoose.connection.client.topology;
  if (topology && topology.description) {
    const desc = topology.description;
    if (desc.type === 'Single') {
      const server = Array.from(desc.servers.values())[0];
      if (server && server.type === 'Standalone') {
        transactionsSupported = false;
      }
    }
  }

  if (!transactionsSupported) {
    console.log('⚠ Standalone MongoDB detected. Transactions are not supported. Mocking startSession to return a dummy transactionless session.');
    
    const mockStartSession = async function() {
      return {
        startTransaction: () => {},
        commitTransaction: async () => {},
        abortTransaction: async () => {},
        endSession: () => {},
        inTransaction: () => false,
        client: mongoose.connection ? mongoose.connection.client : undefined,
        transaction: {
          state: 'NO_TRANSACTION',
          options: {},
        },
        serverSession: {
          id: { id: new mongoose.mongo.Binary(Buffer.alloc(16), 4) },
          lastUse: 0,
          txnNumber: 0,
        },
        supports: {
          causalConsistency: false,
        },
        session: null,
        $session: null,
      };
    };
    mongoose.startSession = mockStartSession;
    if (mongoose.connection) {
      mongoose.connection.startSession = mockStartSession;
    }
  }

  // Import modules
  const { User } = await import('./models/user.model.js');
  const { Store } = await import('./models/store.model.js');
  const { StoreKYC } = await import('./models/storeKYC.model.js');
  const { StoreBalance } = await import('./models/storeBalance.model.js');
  const { PayoutRequest } = await import('./models/payoutRequest.model.js');
  const { EarningsLedger } = await import('./models/earningsLedger.model.js');
  const { Notification } = await import('./models/notification.model.js');
  const { StoreKYCService } = await import('./services/storeKYC.service.js');
  const { PayoutService } = await import('./services/payout.service.js');
  const { decrypt } = await import('./utils/cryptoUtils.js');

  const testEmailPrefix = 'test_kyc_';
  const cleanTestData = async () => {
    const testUsers = await User.find({ email: new RegExp(`^${testEmailPrefix}`) });
    const userIds = testUsers.map(u => u._id);
    await Store.deleteMany({ owner: { $in: userIds } });
    await StoreKYC.deleteMany({ seller: { $in: userIds } });
    await PayoutRequest.deleteMany({ seller: { $in: userIds } });
    await StoreBalance.deleteMany({});
    await EarningsLedger.deleteMany({});
    await Notification.deleteMany({ user: { $in: userIds } });
    await User.deleteMany({ email: new RegExp(`^${testEmailPrefix}`) });
  };

  await cleanTestData();

  // Seed Users
  const sellerA = await User.create({
    firstName: 'Seller',
    lastName: 'A',
    email: `${testEmailPrefix}sellera@example.com`,
    password: 'password123',
    role: 'seller',
    isEmailVerified: true,
    isActive: true,
  });

  const sellerB = await User.create({
    firstName: 'Seller',
    lastName: 'B',
    email: `${testEmailPrefix}sellerb@example.com`,
    password: 'password123',
    role: 'seller',
    isEmailVerified: true,
    isActive: true,
  });

  const admin = await User.create({
    firstName: 'Super',
    lastName: 'Admin',
    email: `${testEmailPrefix}admin@example.com`,
    password: 'password123',
    role: 'super_admin',
    isEmailVerified: true,
    isActive: true,
  });

  const customer = await User.create({
    firstName: 'Customer',
    lastName: 'C',
    email: `${testEmailPrefix}customerc@example.com`,
    password: 'password123',
    role: 'customer',
    isEmailVerified: true,
    isActive: true,
  });

  // Seed Store
  const storeA = await Store.create({
    name: 'Seller A Shop',
    owner: sellerA._id,
    slug: 'seller-a-shop',
    status: 'active',
  });

  const balanceA = await PayoutService.getOrCreateStoreBalance(storeA._id);
  balanceA.availableBalance = 500;
  await balanceA.save();

  console.log('Seeded test users, store, and balance.');

  try {
    // ----------------------------------------------------
    // TEST CASE 1: Seller Onboarding & Encryption Verification
    // ----------------------------------------------------
    console.log('\nRunning Test Case 1: KYC submission & encryption...');
    const payload = {
      legalBusinessName: 'Seller A LLC',
      taxId: '12-3456789',
      bankName: 'Artisan Bank',
      accountHolderName: 'Seller A LLC',
      routingNumber: '111222333',
      accountNumber: '999888777666',
    };

    const kyc = await StoreKYCService.submitKYC(sellerA._id, payload);
    if (kyc.verificationStatus !== 'pending') {
      throw new Error(`Expected KYC status to be pending, got ${kyc.verificationStatus}`);
    }
    console.log('✓ KYC profile submitted successfully. Status is pending.');

    // Fetch directly from DB to verify encryption
    const dbRecord = await StoreKYC.findOne({ store: storeA._id });
    if (dbRecord.taxIdEncrypted === '12-3456789' || dbRecord.bankDetails.accountNumberEncrypted === '999888777666') {
      throw new Error('Encryption verification failed: sensitive fields stored in plaintext!');
    }
    console.log('✓ Encrypted Tax ID and Bank Details verified at rest.');

    // Verify Decryption
    const decryptedTax = decrypt(dbRecord.taxIdEncrypted, dbRecord.taxIdIv);
    const decryptedAccount = decrypt(dbRecord.bankDetails.accountNumberEncrypted, dbRecord.bankDetails.accountNumberIv);
    if (decryptedTax !== '12-3456789' || decryptedAccount !== '999888777666') {
      throw new Error('Decryption utility failed to retrieve original plaintext value.');
    }
    console.log('✓ Decryption matches original plaintext.');

    // ----------------------------------------------------
    // TEST CASE 2: Payout request blocked for non-verified
    // ----------------------------------------------------
    console.log('\nRunning Test Case 2: Payout request block checks...');
    try {
      await PayoutService.requestPayout(sellerA._id, 100, 'idemp-kyc-1');
      throw new Error('Test Case 2 failed: Expected payout request to be blocked due to pending KYC status.');
    } catch (err) {
      if (err.message && err.message.includes('Your store is not KYC verified')) {
        console.log('✓ Payout request blocked for pending KYC profiles.');
      } else {
        throw err;
      }
    }

    // ----------------------------------------------------
    // TEST CASE 3: Admin review - Approved & Payout released
    // ----------------------------------------------------
    console.log('\nRunning Test Case 3: Admin review approval & payout verification...');
    const approved = await StoreKYCService.reviewKYC(admin._id, admin.role, kyc._id, { status: 'verified' });
    if (approved.verificationStatus !== 'verified') {
      throw new Error(`Expected verification status to be verified, got ${approved.verificationStatus}`);
    }
    console.log('✓ Admin successfully verified the KYC profile.');

    // Verify notification was sent
    const notif = await Notification.findOne({ user: sellerA._id, title: 'KYC Verification Approved' });
    if (!notif) {
      throw new Error('KYC Approval Notification was not created.');
    }
    console.log('✓ Notification sent to the seller.');

    // Verify payout request now succeeds
    const payoutObj = await PayoutService.requestPayout(sellerA._id, 100, 'idemp-kyc-2');
    if (!payoutObj || payoutObj.amount !== 100) {
      throw new Error('Payout request failed despite verified KYC profile.');
    }
    console.log('✓ Payout request created successfully post-verification.');

    // ----------------------------------------------------
    // TEST CASE 4: Critical bank details update resets status to pending
    // ----------------------------------------------------
    console.log('\nRunning Test Case 4: critical fields update status reset...');
    const updatePayload = {
      legalBusinessName: 'Seller A LLC',
      taxId: '12-3456789',
      bankName: 'Artisan Bank',
      accountHolderName: 'Seller A LLC',
      routingNumber: '111222333',
      accountNumber: '999888777666-NEW', // Changed Account Number
    };

    const reSubmitted = await StoreKYCService.submitKYC(sellerA._id, updatePayload);
    if (reSubmitted.verificationStatus !== 'pending') {
      throw new Error(`Expected status to reset to pending on bank details update, got ${reSubmitted.verificationStatus}`);
    }
    console.log('✓ Verification status reset to pending on critical bank account update.');

    // ----------------------------------------------------
    // TEST CASE 5: RBAC & IDOR protections
    // ----------------------------------------------------
    console.log('\nRunning Test Case 5: RBAC & IDOR protections...');
    
    // RBAC: Seller B trying to approve KYC
    try {
      await StoreKYCService.reviewKYC(sellerB._id, sellerB.role, kyc._id, { status: 'verified' });
      throw new Error('RBAC check failed: Seller B was able to verify KYC profile.');
    } catch (err) {
      if (err.statusCode === 403) {
        console.log('✓ Non-admin role blocked from executing reviews.');
      } else {
        throw err;
      }
    }

    // IDOR: Seller B trying to read Seller A's KYC profile
    const profile = await StoreKYCService.getKYCProfile(sellerB._id, sellerB.role);
    if (profile.verificationStatus !== 'unsubmitted') {
      throw new Error('IDOR check failed: Seller B retrieved Seller A\'s profile details.');
    }
    console.log('✓ IDOR checks successfully isolated customer profiles.');

    // Clean up
    await cleanTestData();
    console.log('\n--- ALL KYC INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n✖ TEST SUITE FAILED WITH ERROR:', error);
    await cleanTestData();
    await mongoose.disconnect();
    process.exit(1);
  }
}

runTests();
