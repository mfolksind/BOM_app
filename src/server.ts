import { Server } from 'http';
import { app } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDatabase, disconnectDatabase } from './config/database';

let server: Server | null = null;

const startServer = async (): Promise<void> => {
  try {
    logger.info('Initializing ERP Backend services...');

    // 1. Establish database connection before accepting traffic
    await connectDatabase({
      maxRetries: env.NODE_ENV === 'production' ? 10 : 5,
      retryIntervalMs: 3000,
    });

    // 2. Start HTTP Listener
    server = app.listen(env.PORT, () => {
      logger.info(
        {
          port: env.PORT,
          environment: env.NODE_ENV,
          healthEndpoint: `http://localhost:${env.PORT}/api/v1/health`,
          readyEndpoint: `http://localhost:${env.PORT}/api/v1/ready`,
        },
        `🚀 ERP Backend Server is running on port ${env.PORT}`,
      );
    });

    server.on('error', (err) => {
      logger.error({ err }, 'Server HTTP listener error');
      process.exit(1);
    });
  } catch (error) {
    logger.fatal({ error: (error as Error).message }, 'Failed to start ERP Backend Server');
    process.exit(1);
  }
};

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed, stopping new incoming connections.');
      try {
        await disconnectDatabase();
        logger.info('Graceful shutdown completed successfully.');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error occurred while disconnecting database during shutdown');
        process.exit(1);
      }
    });

    // Force close after 10s timeout
    setTimeout(() => {
      logger.error('Forced shutdown due to timeout (10s)');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled Promise Rejection detected');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught Exception detected');
  process.exit(1);
});

// Launch server
void startServer();
