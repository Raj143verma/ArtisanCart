import mongoose from 'mongoose';
import { dbConfig } from './index.js';
import { dbConstants } from '../constants/dbConstants.js';
import { logger } from '../utils/logger.js';

let retryCount = 0;

function attachMongooseListeners() {
  const connection = mongoose.connection;

  connection.on('connected', () => logger.info('MongoDB connected'));
  connection.on('reconnected', () => logger.info('MongoDB reconnected'));
  connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  connection.on('close', () => logger.info('MongoDB connection closed'));
  connection.on('error', (error) => logger.error('MongoDB connection error', error));
}

function getRetryDelay() {
  return Math.round(dbConstants.initialRetryDelayMs * dbConstants.retryBackoffFactor ** retryCount);
}

export async function connectDatabase() {
  attachMongooseListeners();

  try {
    await mongoose.connect(dbConfig.uri, dbConfig.options);
    retryCount = 0;
    logger.info('Database connected successfully');
  } catch (error) {
    retryCount += 1;
    logger.error(`MongoDB connection attempt ${retryCount} failed`, error);

    if (retryCount <= dbConstants.maxRetryAttempts) {
      const delay = getRetryDelay();
      logger.info(`Retrying database connection in ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return connectDatabase();
    }

    throw error;
  }
}

export async function disconnectDatabase() {
  if (mongoose.connection.readyState === 0) {
    return;
  }

  await mongoose.disconnect();
  logger.info('Database disconnected gracefully');
}
