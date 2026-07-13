import { appConfig } from './config/index.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import app from './app.js';
import { logger } from './utils/logger.js';
import { validateDatabaseEnv } from './utils/envValidator.js';

validateDatabaseEnv(process.env);

async function startServer() {
  try {
    await connectDatabase();

    let bound = false;
    let portToTry = appConfig.port;
    const server = app.listen(portToTry);

    server.on('listening', () => {
      bound = true;
      logger.info(`Server running on port ${portToTry}`);
    });

    server.on('error', (err) => {
      if (err && err.code === 'EADDRINUSE' && !bound) {
        const altPort = portToTry + 1;
        logger.warn(`Port ${portToTry} in use, attempting ${altPort}`);
        portToTry = altPort;
        server.listen(portToTry);
        return;
      }
      throw err;
    });

    const shutdown = async (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDatabase();
        logger.info('Shutdown complete');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    logger.error('Startup failed', error);
    process.exit(1);
  }
}

startServer();
