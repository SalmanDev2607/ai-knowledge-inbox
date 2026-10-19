import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chunkText } from '../src/services/chunker.js';

const opts = { size: 200, overlap: 40 };

test('returns nothing for blank input', () => {
  assert.deepEqual(chunkText('  \n\n ', opts), []);
});

test('keeps short text as a single chunk', () => {
  assert.deepEqual(chunkText('Hello world.', opts), ['Hello world.']);
});

test('splits long text, bounds chunk size, and keeps every word', () => {
  const words = Array.from({ length: 300 }, (_, i) => `word${i}`);
  const chunks = chunkText(words.join(' '), opts);
  assert.ok(chunks.length > 1);
  for (const c of chunks) assert.ok(c.length <= opts.size + opts.overlap);
  const seen = new Set(chunks.join(' ').split(/\s+/));
  for (const w of words) assert.ok(seen.has(w), `missing ${w}`);
});

test('consecutive chunks overlap', () => {
  const text = Array.from({ length: 80 }, (_, i) => `Sentence number ${i}.`).join(' ');
  const [first, second] = chunkText(text, opts);
  const lastWord = first.split(' ').slice(-2).join(' ');
  assert.ok(second.includes(lastWord));
});
