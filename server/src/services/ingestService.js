import { config } from '../config.js';
import * as repo from '../db/repository.js';
import { AppError } from '../errors.js';
import { logger } from '../logger.js';
import { chunkText } from './chunker.js';
import { embedTexts } from './embeddings.js';
import { fetchPage } from './fetchUrl.js';
import { enqueue } from './ingestQueue.js';
import { invalidateIndex } from './retrieval.js';
import { vectorToBuffer } from './vectors.js';

const deriveTitle = (text) => {
  const firstLine = text.trim().split('\n')[0];
  return firstLine.length > 60 ? `${firstLine.slice(0, 57)}...` : firstLine;
};

/** Save the item immediately; chunking and embedding happen in the background. */
export function submitItem(input) {
  const item =
    input.type === 'note'
      ? repo.createItem({ sourceType: 'note', title: input.title || deriveTitle(input.content), rawContent: input.content })
      : repo.createItem({ sourceType: 'url', title: input.url, sourceUrl: input.url });

  enqueue(`ingest:${item.id}`, () => processItem(item.id));
  return item;
}

async function processItem(id) {
  const log = logger.child({ itemId: id });
  const started = Date.now();
  try {
    let item = repo.getItem(id);
    if (!item) return; // deleted before we got to it

    if (item.sourceType === 'url') {
      const page = await fetchPage(item.sourceUrl);
      repo.setContent(id, { title: page.title || item.title, rawContent: page.text });
      item = repo.getItem(id);
    }

    const texts = chunkText(item.rawContent, { size: config.chunkSize, overlap: config.chunkOverlap });
    if (texts.length === 0) throw new AppError(422, 'EMPTY_CONTENT', 'No readable text was found to index');

    const vectors = await embedTexts(texts);
    repo.saveChunksAndMarkReady(
      id,
      texts.map((text, position) => ({ position, text, embedding: vectorToBuffer(vectors[position]) }))
    );
    invalidateIndex();
    log.info({ chunks: texts.length, ms: Date.now() - started }, 'item ingested');
  } catch (err) {
    log.error({ err, ms: Date.now() - started }, 'ingestion failed');
    repo.markFailed(id, err instanceof AppError ? err.message : 'Unexpected error while processing this item');
  }
}
