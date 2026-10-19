import OpenAI from 'openai';
import { config } from '../config.js';
import { AppError } from '../errors.js';
import { logger } from '../logger.js';

let client;
export function getOpenAI() {
  client ??= new OpenAI({
    apiKey: config.openaiApiKey,
    baseURL: config.openaiBaseUrl,
    timeout: 30_000,
    maxRetries: 2,
  });
  return client;
}

/** Turn an SDK failure into a 502 without leaking upstream internals to the client. */
export function upstreamError(code, label, err) {
  logger.error({ err, upstreamStatus: err.status }, `${label} failed`);
  let hint = '';
  if (err.code === 'credit_balance_exhausted' || err.code === 'insufficient_quota' || err.message?.includes('credits')) {
    hint = ' (OpenAI account has no remaining credits; please add credits or update OPENAI_API_KEY in server/.env)';
  } else if (err.status === 429) {
    hint = ' (rate limited, try again shortly)';
  } else if (err.status === 401) {
    hint = ' (invalid OpenAI API key; please check OPENAI_API_KEY in server/.env)';
  }
  return new AppError(502, code, `${label} failed${hint}`);
}
