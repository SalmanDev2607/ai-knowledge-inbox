import * as repo from '../db/repository.js';
import { bufferToVector, dot } from './vectors.js';

// Brute-force search over an in-memory copy of every chunk vector.
// The cache is rebuilt lazily after any change to the chunks table.
let index = null;

export const invalidateIndex = () => {
  index = null;
};

function loadIndex() {
  index ??= repo.loadReadyChunks().map(({ embedding, ...row }) => ({ ...row, vector: bufferToVector(embedding) }));
  return index;
}

export function searchChunks(queryVector, { topK, minScore }) {
  return loadIndex()
    .map((chunk) => ({ chunk, score: dot(queryVector, chunk.vector) }))
    .filter((hit) => hit.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}
