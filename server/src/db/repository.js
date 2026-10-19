import { randomUUID } from 'node:crypto';
import { db } from './index.js';

const toItem = (row) =>
  row && {
    id: row.id,
    sourceType: row.source_type,
    title: row.title,
    sourceUrl: row.source_url,
    status: row.status,
    error: row.error,
    createdAt: row.created_at,
    rawContent: row.raw_content,
  };

const sql = {
  insertItem: db.prepare(`
    INSERT INTO items (id, source_type, title, source_url, raw_content, status, created_at)
    VALUES (@id, @sourceType, @title, @sourceUrl, @rawContent, 'processing', @createdAt)`),
  getItem: db.prepare('SELECT * FROM items WHERE id = ?'),
  listItems: db.prepare(`
    SELECT i.id, i.source_type, i.title, i.source_url, i.status, i.error, i.created_at,
           substr(i.raw_content, 1, 200) AS preview,
           length(i.raw_content)         AS char_count,
           (SELECT count(*) FROM chunks c WHERE c.item_id = i.id) AS chunk_count
    FROM items i ORDER BY i.created_at DESC`),
  setContent: db.prepare('UPDATE items SET title = @title, raw_content = @rawContent WHERE id = @id'),
  markReady: db.prepare("UPDATE items SET status = 'ready', error = NULL WHERE id = ?"),
  markFailed: db.prepare("UPDATE items SET status = 'failed', error = ? WHERE id = ?"),
  failInterrupted: db.prepare(
    "UPDATE items SET status = 'failed', error = 'Interrupted by a server restart. Delete and add it again.' WHERE status = 'processing'"
  ),
  deleteItem: db.prepare('DELETE FROM items WHERE id = ?'),
  insertChunk: db.prepare('INSERT INTO chunks (item_id, position, text, embedding) VALUES (?, ?, ?, ?)'),
  loadReadyChunks: db.prepare(`
    SELECT c.id AS chunk_id, c.item_id, c.position, c.text, c.embedding,
           i.title, i.source_url, i.source_type
    FROM chunks c JOIN items i ON i.id = c.item_id
    WHERE i.status = 'ready'`),
};

export const getItem = (id) => toItem(sql.getItem.get(id));

export function createItem({ sourceType, title, sourceUrl = null, rawContent = '' }) {
  const id = randomUUID();
  sql.insertItem.run({ id, sourceType, title, sourceUrl, rawContent, createdAt: new Date().toISOString() });
  return getItem(id);
}

export const listItems = () =>
  sql.listItems.all().map((r) => ({
    id: r.id,
    sourceType: r.source_type,
    title: r.title,
    sourceUrl: r.source_url,
    status: r.status,
    error: r.error,
    createdAt: r.created_at,
    preview: r.preview,
    charCount: r.char_count,
    chunkCount: r.chunk_count,
  }));

export const setContent = (id, { title, rawContent }) => sql.setContent.run({ id, title, rawContent });
export const markFailed = (id, message) => sql.markFailed.run(message, id);
export const deleteItem = (id) => sql.deleteItem.run(id).changes > 0;
export const failInterruptedItems = () => sql.failInterrupted.run().changes;
export const loadReadyChunks = () => sql.loadReadyChunks.all();

/** Chunks and the status flip commit together, so an item is never "ready" without its chunks. */
export const saveChunksAndMarkReady = db.transaction((itemId, chunks) => {
  for (const c of chunks) sql.insertChunk.run(itemId, c.position, c.text, c.embedding);
  sql.markReady.run(itemId);
});
