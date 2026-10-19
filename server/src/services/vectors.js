// Embeddings are stored as raw float32 bytes in SQLite and normalised to unit length,
// so cosine similarity is just a dot product.

export function normalize(values) {
  const v = Float32Array.from(values);
  let norm = 0;
  for (const x of v) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < v.length; i++) v[i] /= norm;
  return v;
}

export const vectorToBuffer = (v) => Buffer.from(v.buffer, v.byteOffset, v.byteLength);

export function bufferToVector(buf) {
  const copy = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  return new Float32Array(copy);
}

export function dot(a, b) {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
