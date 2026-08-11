import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: './.env' });

async function runTests() {
  console.log('--- STARTING SYSTEM AUDIT TRAIL INTEGRATION TESTS ---');
  await mongoose.connect('mongodb://127.0.0.1:27017/ArtisianCartTest?retryWrites=false');
  console.log('Connected to Database.');

  // Import models and services
  const { User } = await import('./models/user.model.js');
  const { Store } = await import('./models/store.model.js');
  const { StoreKYC } = await import('./models/storeKYC.model.js');
  const { PayoutRequest } = await import('./models/payoutRequest.model.js');
  const { ReturnRequest } = await import('./models/returnRequest.model.js');
  const { AuditLog } = await import('./models/auditLog.model.js');
  const { AuditLogService } = await import('./services/auditLog.service.js');
  const { StoreService } = await import('./services/store.service.js');
  const { StoreKYCService } = await import('./services/storeKYC.service.js');
  const { PayoutService } = await import('./services/payout.service.js');
  const { ReturnService } = await import('./services/return.service.js');

  const testEmailPrefix = 'test_audit_';
  const cleanTestData = async () => {
    const testUsers = await User.find({ email: new RegExp(`^${testEmailPrefix}`) });
    const userIds = testUsers.map(u => u._id);
    await Store.deleteMany({ owner: { $in: userIds } });
    await StoreKYC.deleteMany({ seller: { $in: userIds } });
    await PayoutRequest.deleteMany({ seller: { $in: userIds } });
    await ReturnRequest.deleteMany({ customer: { $in: userIds } });
    if (mongoose.connection && mongoose.connection.db) {
      await mongoose.connection.db.collection('auditlogs').deleteMany({});
    }
    await User.deleteMany({ email: new RegExp(`^${testEmailPrefix}`) });
  };

  await cleanTestData();

  // Seed Users
  const seller = await User.create({
    firstName: 'Audit',
    lastName: 'Seller',
    email: `${testEmailPrefix}seller@example.com`,
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
    firstName: 'Audit',
    lastName: 'Customer',
    email: `${testEmailPrefix}customer@example.com`,
    password: 'password123',
    role: 'customer',
    isEmailVerified: true,
    isActive: true,
  });

  // Seed Store
  const store = await Store.create({
    name: 'Audit Store',
    owner: seller._id,
    slug: 'audit-store',
    status: 'pending_approval',
  });

  console.log('Seeded test users and store.');

  try {
    // ----------------------------------------------------
    // TEST CASE 1: Log Immutability Enforcement
    // ----------------------------------------------------
    console.log('\nRunning Test Case 1: Log immutability checks...');
    const log = await AuditLogService.logAction(
      admin,
      'test.action',
      'Store',
      store._id,
      { before: { status: 'pending' }, after: { status: 'active' } }
    );

    if (!log) {
      throw new Error('Failed to create initial test audit log.');
    }
    console.log('✓ Initial audit log created successfully.');

    // Attempt modification via save
    try {
      log.actorEmail = 'hacker@malicious.com';
      await log.save();
      throw new Error('Test Case 1 failed: Expected log modification (save) to throw error.');
    } catch (err) {
      if (err.message && err.message.includes('Audit logs are immutable')) {
        console.log('✓ Blocked log update (save) query successfully.');
      } else {
        throw err;
      }
    }

    // Attempt delete
    try {
      await AuditLog.deleteOne({ _id: log._id });
      throw new Error('Test Case 1 failed: Expected log deletion to throw error.');
    } catch (err) {
      if (err.message && err.message.includes('Audit logs are immutable')) {
        console.log('✓ Blocked log deletion successfully.');
      } else {
        throw err;
      }
    }

    // ----------------------------------------------------
    // TEST CASE 2: PII Data Masking Verification
    // ----------------------------------------------------
    console.log('\nRunning Test Case 2: PII details masking...');
    const piiLog = await AuditLogService.logAction(
      admin,
      'kyc.submit_details',
      'StoreKYC',
      new mongoose.Types.ObjectId(),
      {
        before: {
          taxId: '12-3456789',
          bankDetails: {
            accountNumber: '111222333444',
            routingNumber: '999888',
          }
        },
        after: {
          taxId: '12-3456789',
          bankDetails: {
            accountNumber: '111222333444',
            routingNumber: '999888',
          }
        }
      }
    );

    const retrievedPii = await AuditLog.findById(piiLog._id);
    const beforeObj = retrievedPii.changes.before;
    if (beforeObj.taxId !== '[MASKED]' || beforeObj.bankDetails.accountNumber !== '[MASKED]' || beforeObj.bankDetails.routingNumber !== '[MASKED]') {
      throw new Error(`PII fields not masked! Got: ${JSON.stringify(beforeObj)}`);
    }
    console.log('✓ Sensitive tax and bank credentials successfully masked in changes object.');

    // ----------------------------------------------------
    // TEST CASE 3: Integration Triggers (Store approval/rejection)
    // ----------------------------------------------------
    console.log('\nRunning Test Case 3: Store approvals trigger tracking...');
    
    // Approve Store
    const approvedStore = await StoreService.approve(store._id, admin);
    if (approvedStore.status !== 'active') {
      throw new Error('Store approval failed.');
    }

    // Verify AuditLog exists for store approval
    const approvalLog = await AuditLog.findOne({
      action: 'store.approve',
      targetId: store._id,
      actor: admin._id,
    });
    if (!approvalLog) {
      throw new Error('Audit log for store.approve action was not created.');
    }
    if (approvalLog.changes.before.status !== 'pending_approval' || approvalLog.changes.after.status !== 'active') {
      throw new Error(`Unexpected diff in store.approve audit log: before=${approvalLog.changes.before.status}, after=${approvalLog.changes.after.status}`);
    }
    console.log('✓ Audit log created with correct before/after states for store.approve.');

    // Clean up
    await cleanTestData();
    console.log('\n--- ALL AUDIT LOG INTEGRATION TESTS PASSED SUCCESSFULLY! ---');
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
