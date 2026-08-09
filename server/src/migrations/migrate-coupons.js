import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Coupon } from '../models/coupon.model.js';
import { logger } from '../utils/logger.js';

async function migrate() {
  try {
    await connectDatabase();
    logger.info('Starting coupons schema migration...');

    // 1. Document property backfills
    const result = await Coupon.updateMany(
      { scope: { $exists: false } },
      {
        $set: {
          scope: 'marketplace',
          perUserLimit: 1,
          products: [],
          categories: [],
          eligibleCustomers: [],
          deletedAt: null,
        },
      }
    );

    logger.info(`Migration complete. Updated ${result.modifiedCount} legacy coupons.`);

    // 2. Index management
    const collection = mongoose.connection.db.collection('coupons');
    const indexes = await collection.indexes();
    logger.info(`Current indexes: ${JSON.stringify(indexes.map((idx) => idx.name))}`);

    const legacyIndex = indexes.find((idx) => idx.name === 'code_1');
    if (legacyIndex) {
      // Check if it is a partial index
      const isPartial = legacyIndex.partialFilterExpression && legacyIndex.partialFilterExpression.deletedAt !== undefined;
      if (!isPartial) {
        logger.info('Dropping legacy standard unique index "code_1"...');
        await collection.dropIndex('code_1');
      } else {
        logger.info('Legacy index "code_1" is already a partial index.');
      }
    }

    logger.info('Creating partial unique index on "code"...');
    await collection.createIndex(
      { code: 1 },
      {
        unique: true,
        partialFilterExpression: { deletedAt: null },
      }
    );

    // Verify index configuration
    const updatedIndexes = await collection.indexes();
    logger.info(`Indexes after migration: ${JSON.stringify(updatedIndexes.map((idx) => idx.name))}`);

    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed', error);
    process.exit(1);
  }
}

migrate();
