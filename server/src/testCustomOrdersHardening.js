import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config({ path: './.env' });

async function runTests() {
  console.log('--- STARTING CUSTOM ORDERS HARDENING INTEGRATION TESTS ---');
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

  // Import models and services
  const { User } = await import('./models/user.model.js');
  const { Store } = await import('./models/store.model.js');
  const { CustomOrder } = await import('./models/customOrder.model.js');
  const { Order } = await import('./models/order.model.js');
  const { StoreBalance } = await import('./models/storeBalance.model.js');
  const { EarningsLedger } = await import('./models/earningsLedger.model.js');
  const { RefundTransaction } = await import('./models/refundTransaction.model.js');
  const { Notification } = await import('./models/notification.model.js');
  const { CustomOrderService } = await import('./services/customOrder.service.js');
  const { PayoutService } = await import('./services/payout.service.js');

  const testEmailPrefix = 'test_co_';
  const cleanTestData = async () => {
    const testUsers = await User.find({ email: new RegExp(`^${testEmailPrefix}`) });
    const userIds = testUsers.map(u => u._id);
    await Store.deleteMany({ owner: { $in: userIds } });
    await CustomOrder.deleteMany({ user: { $in: userIds } });
    await Order.deleteMany({ customer: { $in: userIds } });
    await RefundTransaction.deleteMany({});
    await StoreBalance.deleteMany({});
    await EarningsLedger.deleteMany({});
    await Notification.deleteMany({ user: { $in: userIds } });
    await User.deleteMany({ email: new RegExp(`^${testEmailPrefix}`) });
  };

  await cleanTestData();

  // Seed Users
  const seller = await User.create({
    firstName: 'Bespoke',
    lastName: 'Seller',
    email: `${testEmailPrefix}seller@example.com`,
    password: 'password123',
    role: 'seller',
    isEmailVerified: true,
    isActive: true,
  });

  const customer = await User.create({
    firstName: 'Bespoke',
    lastName: 'Customer',
    email: `${testEmailPrefix}customer@example.com`,
    password: 'password123',
    role: 'customer',
    isEmailVerified: true,
    isActive: true,
  });

  const store = await Store.create({
    name: 'Bespoke Shop',
    owner: seller._id,
    slug: 'bespoke-shop',
    status: 'active',
  });

  console.log('Seeded users and store.');

  try {
    // ----------------------------------------------------
    // TEST CASE 1: Cancellation & Financial Balance Reversal
    // ----------------------------------------------------
    console.log('\nRunning Test Case 1: Paid custom order cancellation & payout balance reversal...');
    
    // Create Custom Order in approved state
    const customOrder = await CustomOrder.create({
      user: customer._id,
      store: store._id,
      title: 'Bespoke Oak Table',
      description: 'Hand-carved wooden table',
      budget: 800,
      status: 'approved',
    });

    // Create Paid Order associated with this custom order
    const order = await Order.create({
      orderNumber: `ORD-CUSTOM-TEST-1`,
      customer: customer._id,
      seller: seller._id,
      customOrder: customOrder._id,
      items: [{
        quantity: 1,
        price: 800,
        discountAllocated: 0,
        netTotal: 800,
        productTitle: 'Bespoke Oak Table',
        variantSku: 'CUSTOM-ORDER',
        variantAttributes: {},
      }],
      shippingAddress: {
        fullName: 'Test Customer',
        phone: '1234567890',
        addressLine1: '123 Art Place',
        city: 'Art City',
        state: 'Art State',
        postalCode: '12345',
        country: 'US',
      },
      pricing: {
        subtotal: 800,
        shippingFee: 0,
        tax: 0,
        discount: 0,
        total: 800,
      },
      status: 'confirmed',
      paymentStatus: 'paid',
    });

    // Record pending sale (triggers pending balance of +800)
    await PayoutService.recordPendingSale(order._id);

    const initialBalance = await StoreBalance.findOne({ store: store._id });
    if (initialBalance.pendingBalance !== 800) {
      throw new Error(`Expected initial pending balance to be 800, got ${initialBalance.pendingBalance}`);
    }
    console.log('✓ Pending sale recorded. Initial pending balance: $800.');

    // Cancel Custom Order (should trigger reversal and refund log)
    const cancelled = await CustomOrderService.cancelCustomOrder(seller._id, seller.role, customOrder._id, 'Seller material shortage');
    if (cancelled.status !== 'cancelled') {
      throw new Error(`Expected custom order status to be cancelled, got ${cancelled.status}`);
    }

    // Verify associated Order status and payment status
    const updatedOrder = await Order.findById(order._id);
    if (updatedOrder.status !== 'cancelled' || updatedOrder.paymentStatus !== 'refunded') {
      throw new Error(`Expected order to be cancelled & refunded, got status=${updatedOrder.status}, paymentStatus=${updatedOrder.paymentStatus}`);
    }
    console.log('✓ Associated Order cancelled and paymentStatus updated to refunded.');

    // Verify pending balance is reversed back to 0
    const finalBalance = await StoreBalance.findOne({ store: store._id });
    if (finalBalance.pendingBalance !== 0) {
      throw new Error(`Expected pending balance to be 0 after reversal, got ${finalBalance.pendingBalance}`);
    }
    console.log('✓ Payout balance reversed successfully. Pending balance: $0.');

    // Verify EarningsLedger debit entry is logged
    const ledgerReversal = await EarningsLedger.findOne({
      order: order._id,
      transactionType: 'adjustment',
      amount: -800,
    });
    if (!ledgerReversal) {
      throw new Error('Ledger reversal entry was not recorded.');
    }
    console.log('✓ EarningsLedger debit entry verified.');

    // Verify RefundTransaction logged
    const refundTx = await RefundTransaction.findOne({ order: order._id, amount: 800 });
    if (!refundTx || refundTx.status !== 'succeeded') {
      throw new Error('RefundTransaction record was not created successfully.');
    }
    console.log('✓ RefundTransaction document created successfully.');

    // ----------------------------------------------------
    // TEST CASE 2: Bespoke Work Completion on progressive status orders
    // ----------------------------------------------------
    console.log('\nRunning Test Case 2: Bespoke work completion on processing/shipped orders...');

    // Create Custom Order in progress state
    const customOrder2 = await CustomOrder.create({
      user: customer._id,
      store: store._id,
      title: 'Bespoke Clay Vase',
      description: 'Glazed blue vase',
      budget: 300,
      status: 'in_progress',
    });

    // Create paid Order associated with this custom order, already updated to 'processing'
    const order2 = await Order.create({
      orderNumber: `ORD-CUSTOM-TEST-2`,
      customer: customer._id,
      seller: seller._id,
      customOrder: customOrder2._id,
      items: [{
        quantity: 1,
        price: 300,
        discountAllocated: 0,
        netTotal: 300,
        productTitle: 'Bespoke Clay Vase',
        variantSku: 'CUSTOM-ORDER',
        variantAttributes: {},
      }],
      shippingAddress: {
        fullName: 'Test Customer',
        phone: '1234567890',
        addressLine1: '123 Art Place',
        city: 'Art City',
        state: 'Art State',
        postalCode: '12345',
        country: 'US',
      },
      pricing: {
        subtotal: 300,
        shippingFee: 0,
        tax: 0,
        discount: 0,
        total: 300,
      },
      status: 'processing', // Already processing
      paymentStatus: 'paid',
    });

    // Record pending sale
    await PayoutService.recordPendingSale(order2._id);

    const initialBalance2 = await StoreBalance.findOne({ store: store._id });
    if (initialBalance2.pendingBalance !== 300) {
      throw new Error(`Expected pending balance to be 300, got ${initialBalance2.pendingBalance}`);
    }
    console.log('✓ Pending sale recorded. Initial pending balance: $300.');

    // Complete work on Custom Order
    const completed = await CustomOrderService.completeWork(seller._id, customOrder2._id);
    if (completed.status !== 'completed') {
      throw new Error(`Expected custom order status to be completed, got ${completed.status}`);
    }

    // Verify associated Order status updated to delivered
    const updatedOrder2 = await Order.findById(order2._id);
    if (updatedOrder2.status !== 'delivered') {
      throw new Error(`Expected order status to be delivered, got ${updatedOrder2.status}`);
    }
    console.log('✓ Associated Order updated to delivered (progressive status matching passed).');

    // Verify balance is cleared and released
    const finalBalance2 = await StoreBalance.findOne({ store: store._id });
    if (finalBalance2.pendingBalance !== 0) {
      throw new Error(`Expected pending balance to clear to 0, got ${finalBalance2.pendingBalance}`);
    }
    // Net earnings: 300 - 10% commission = 270. Available: 0 + 270 = 270
    if (finalBalance2.availableBalance !== 270) {
      throw new Error(`Expected available balance to receive net earnings of 270, got ${finalBalance2.availableBalance}`);
    }
    console.log('✓ Pending balance cleared and available earnings released: $270.');

    // ----------------------------------------------------
    // TEST CASE 3: Transaction Rollback Protection
    // ----------------------------------------------------
    console.log('\nRunning Test Case 3: Transaction rollback simulation...');
    
    // Seed new custom order
    const customOrder3 = await CustomOrder.create({
      user: customer._id,
      store: store._id,
      title: 'Bespoke Necklace',
      description: 'Gold chain necklace',
      budget: 150,
      status: 'approved',
    });

    // Setup an intentional write error by violating a schema constraint mid-save during notification dispatch
    const originalSendNotification = Notification.create;
    Notification.create = async function() {
      throw new Error('SIMULATED DATABASE WRITE FAILURE');
    };

    try {
      await CustomOrderService.cancelCustomOrder(seller._id, seller.role, customOrder3._id, 'Shortage');
      throw new Error('Test Case 3 failed: expected error to be thrown.');
    } catch (err) {
      if (err.message === 'SIMULATED DATABASE WRITE FAILURE') {
        console.log('✓ Exception caught successfully during mid-transaction failure.');
      } else {
        throw err;
      }
    }

    // Restore notification mock
    Notification.create = originalSendNotification;

    // Verify that due to rollback, Custom Order status remains approved (not cancelled)
    const orderCheck = await CustomOrder.findById(customOrder3._id);
    if (transactionsSupported) {
      if (orderCheck.status !== 'approved') {
        throw new Error(`Expected custom order status to rollback to approved, but got ${orderCheck.status}`);
      }
      console.log('✓ Rollback confirmed: custom order status reverted to approved.');
    } else {
      console.log('✓ Standalone mode: exception caught. Skipped rollback check.');
    }

    // Clean up
    await cleanTestData();
    console.log('\n--- ALL CUSTOM ORDER HARDENING TESTS PASSED SUCCESSFULLY! ---');
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
