import { useState } from 'react';

const STATUS_LABEL = { processing: 'Indexing…', ready: 'Ready', failed: 'Failed' };

function Item({ item, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await onDelete(item.id);
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  return (
    <li className="item">
      <div className="item-head">
        <strong className="item-title">
          {item.sourceUrl ? (
            <a href={item.sourceUrl} target="_blank" rel="noreferrer">{item.title}</a>
          ) : (
            item.title
          )}
        </strong>
        <span className={`badge ${item.status}`}>{STATUS_LABEL[item.status]}</span>
      </div>
      <p className="meta">
        {item.sourceType === 'url' ? 'Web page' : 'Note'}, saved {new Date(item.createdAt).toLocaleString()}
        {item.status === 'ready' && `, ${item.chunkCount} ${item.chunkCount === 1 ? 'chunk' : 'chunks'}`}
      </p>
      {item.preview && <p className="preview">{item.preview}</p>}
      {item.status === 'failed' && <p className="error">{item.error}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <button type="button" className="link" onClick={handleDelete} disabled={deleting}>
        {deleting ? 'Deleting…' : 'Delete'}
      </button>
    </li>
  );
}

export default function ItemList({ items, loading, error, onDelete }) {
  return (
    <section className="panel">
      <h2>Saved items ({items.length})</h2>
      {error && <p className="error" role="alert">{error}</p>}
      {loading ? (
        <p className="muted">Loading…</p>
      ) : items.length === 0 ? (
        <p className="muted">Nothing saved yet. Add a note or a web page above.</p>
      ) : (
        <ul className="items">
          {items.map((item) => (
            <Item key={item.id} item={item} onDelete={onDelete} />
          ))}
        </ul>
      )}
    </section>
  );
}
