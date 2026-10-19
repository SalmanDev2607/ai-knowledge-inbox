import express from 'express';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
import { ingestRouter } from './routes/ingest.js';
import { itemsRouter } from './routes/items.js';
import { queryRouter } from './routes/query.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(express.json({ limit: '256kb' }));

  app.get(['/health', '/api/health'], (req, res) => res.json({ status: 'ok' }));
  app.use(['/ingest', '/api/ingest'], ingestRouter);
  app.use(['/items', '/api/items'], itemsRouter);
  app.use(['/query', '/api/query'], queryRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
