import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(import.meta.dirname, '../.env') });
dotenv.config();

const num = (value, fallback) => (value === undefined || value === '' ? fallback : Number(value));

export const config = {
  port: num(process.env.PORT, 3001),
  logLevel: process.env.LOG_LEVEL || 'info',
  dbPath: process.env.DB_PATH || path.resolve(import.meta.dirname, '../data/inbox.db'),

  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiBaseUrl: process.env.OPENAI_BASE_URL || undefined,
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
  chatModel: process.env.CHAT_MODEL || 'gpt-4o-mini',

  // Chunking is measured in characters (~4 chars per token): 1200 chars is roughly 300 tokens.
  chunkSize: num(process.env.CHUNK_SIZE, 1200),
  chunkOverlap: num(process.env.CHUNK_OVERLAP, 150),

  // Retrieval
  topK: num(process.env.TOP_K, 5),
  minScore: num(process.env.MIN_SCORE, 0.25),

  // URL fetching
  fetchTimeoutMs: 10_000,
  maxFetchBytes: 2 * 1024 * 1024,
};
