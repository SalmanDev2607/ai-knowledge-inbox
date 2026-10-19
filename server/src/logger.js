import pino from 'pino';
import { config } from './config.js';

// JSON logs. Pipe through `pino-pretty` locally if you want them human-readable.
export const logger = pino({
  level: config.logLevel,
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
});
