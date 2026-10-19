import { config } from '../config.js';
import { logger } from '../logger.js';
import { embedTexts } from './embeddings.js';
import { generateAnswer } from './llm.js';
import { searchChunks } from './retrieval.js';

const NO_MATCH_ANSWER = "I couldn't find anything relevant in your saved items.";

export async function answerQuestion(question, { topK = config.topK } = {}) {
  const started = Date.now();

  const [queryVector] = await embedTexts([question]);
  const hits = searchChunks(queryVector, { topK, minScore: config.minScore });
  const retrievedMs = Date.now() - started;

  // No relevant chunks: skip the LLM call entirely. Cheaper, and it cannot hallucinate.
  if (hits.length === 0) {
    logger.info({ retrievedMs, hits: 0 }, 'query had no relevant chunks');
    return { answer: NO_MATCH_ANSWER, sources: [] };
  }

  const passages = hits.map(({ chunk }) => ({ title: chunk.title, text: chunk.text }));
  const answer = await generateAnswer(question, passages);
  const cited = new Set([...answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));

  logger.info({ retrievedMs, totalMs: Date.now() - started, hits: hits.length, topScore: hits[0].score }, 'query answered');

  return {
    answer,
    sources: hits.map(({ chunk, score }, i) => ({
      ref: i + 1,
      itemId: chunk.item_id,
      title: chunk.title,
      sourceType: chunk.source_type,
      sourceUrl: chunk.source_url,
      chunkPosition: chunk.position,
      score: Number(score.toFixed(3)),
      snippet: chunk.text,
      cited: cited.has(i + 1),
    })),
  };
}
