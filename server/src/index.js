import { createApp } from './app.js';
import { config } from './config.js';
import { db } from './db/index.js';
import * as repo from './db/repository.js';
import { logger } from './logger.js';

if (!config.openaiApiKey) {
  logger.fatal('OPENAI_API_KEY is not set. Copy server/.env.example to server/.env and add your key.');
  process.exit(1);
}

const interrupted = repo.failInterruptedItems();
if (interrupted > 0) logger.warn({ interrupted }, 'marked items interrupted by a restart as failed');

const server = createApp().listen(config.port, () => logger.info({ port: config.port }, 'server listening'));

function shutdown(signal) {
  logger.info({ signal }, 'shutting down');
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
