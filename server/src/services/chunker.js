// Recursive character chunking: prefer paragraph breaks, then lines, then sentences, then words.
// Pieces are packed greedily up to `size`, and each new chunk starts with the tail of the previous
// one (`overlap`) so a sentence that straddles a boundary still appears whole in one chunk.
// A chunk can therefore reach size + overlap characters.

const SEPARATORS = ['\n\n', '\n', '. ', ' '];

function splitRecursive(text, size, level = 0) {
  if (text.length <= size) return [text];
  if (level >= SEPARATORS.length) {
    const out = [];
    for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
    return out;
  }
  const sep = SEPARATORS[level];
  const parts = text.split(sep).map((p, i, all) => (i < all.length - 1 ? p + sep : p));
  return parts.flatMap((p) => (p.length > size ? splitRecursive(p, size, level + 1) : [p]));
}

function overlapTail(text, overlap) {
  if (overlap <= 0 || text.length <= overlap) return '';
  const tail = text.slice(-overlap);
  const firstSpace = tail.indexOf(' ');
  return firstSpace >= 0 ? tail.slice(firstSpace + 1) : tail; // start on a word boundary
}

export function chunkText(raw, { size, overlap }) {
  const text = raw
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!text) return [];

  const chunks = [];
  let current = '';
  for (const piece of splitRecursive(text, size)) {
    if (current && current.length + piece.length > size) {
      chunks.push(current.trim());
      current = overlapTail(current, overlap) + piece;
    } else {
      current += piece;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}
