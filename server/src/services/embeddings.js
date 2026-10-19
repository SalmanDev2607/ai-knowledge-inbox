import { config } from '../config.js';
import { getOpenAI, upstreamError } from './openaiClient.js';
import { normalize } from './vectors.js';

const BATCH_SIZE = 96;

/** Returns one normalised Float32Array per input text, in order. */
export async function embedTexts(texts) {
  const vectors = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    try {
      const res = await getOpenAI().embeddings.create({ model: config.embeddingModel, input: batch });
      for (const row of res.data) vectors.push(normalize(row.embedding));
    } catch (err) {
      throw upstreamError('EMBEDDING_FAILED', 'Embedding request', err);
    }
  }
  return vectors;
}
