import mongoose from 'mongoose';
import { env } from '../../config/env';
import { logger } from '../../config/logger';

interface ConnectOptions {
  maxRetries?: number;
  retryIntervalMs?: number;
}

const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_RETRY_INTERVAL_MS = 3000;

let isConnecting = false;

// Setup Mongoose connection event listeners once
const setupConnectionEvents = (): void => {
  mongoose.connection.on('connected', () => {
    logger.info(
      {
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name,
      },
      'MongoDB connection established successfully',
    );
  });

  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'MongoDB encountered a connection error');
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection lost / disconnected');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB connection re-established');
  });
};

setupConnectionEvents();

/**
 * Connect to MongoDB with automatic retry logic and timeouts.
 */
export const connectDatabase = async (options: ConnectOptions = {}): Promise<typeof mongoose> => {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryIntervalMs = options.retryIntervalMs ?? DEFAULT_RETRY_INTERVAL_MS;

  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (isConnecting) {
    logger.debug('Database connection already in progress, waiting...');
    return mongoose;
  }

  isConnecting = true;
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    try {
      logger.info(
        {
          uri: env.MONGODB_URI.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@'),
          attempt,
          maxRetries,
        },
        `Attempting to connect to MongoDB (Attempt ${attempt}/${maxRetries})...`,
      );

      await mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        autoIndex: env.NODE_ENV !== 'production',
      });

      isConnecting = false;
      return mongoose;
    } catch (error) {
      logger.error(
        { attempt, maxRetries, error: (error as Error).message },
        `Failed to connect to MongoDB on attempt ${attempt}/${maxRetries}`,
      );

      if (attempt >= maxRetries) {
        isConnecting = false;
        throw new Error(
          `Could not establish connection to MongoDB after ${maxRetries} attempts: ${
            (error as Error).message
          }`,
        );
      }

      logger.info(`Retrying MongoDB connection in ${retryIntervalMs / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, retryIntervalMs));
    }
  }

  isConnecting = false;
  throw new Error('Unexpected exit from MongoDB connection retry loop');
};

/**
 * Disconnect from MongoDB cleanly for graceful process shutdown.
 */
export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    logger.info('Closing MongoDB connection...');
    await mongoose.disconnect();
    logger.info('MongoDB connection closed successfully');
  }
};

/**
 * Check if MongoDB is currently in readyState 1 (connected).
 */
export const isDatabaseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

/**
 * Human-readable connection status.
 */
export const getDatabaseStatus = (): {
  state: 'disconnected' | 'connected' | 'connecting' | 'disconnecting' | 'uninitialized';
  readyState: number;
} => {
  const readyState = mongoose.connection.readyState;
  let state: 'disconnected' | 'connected' | 'connecting' | 'disconnecting' | 'uninitialized' =
    'disconnected';

  switch (readyState) {
    case 1:
      state = 'connected';
      break;
    case 2:
      state = 'connecting';
      break;
    case 3:
      state = 'disconnecting';
      break;
    case 0:
    default:
      state = 'disconnected';
      break;
  }

  return {
    state,
    readyState,
  };
};
