import { useState } from 'react';

export default function AddItemForm({ onAdd }) {
  const [mode, setMode] = useState('note');
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onAdd(mode === 'note' ? { type: 'note', content: value } : { type: 'url', url: value });
      setValue('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="panel">
      <h2>Save something</h2>
      <div className="tabs" role="tablist">
        {['note', 'url'].map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={mode === m ? 'tab active' : 'tab'}
            onClick={() => {
              setMode(m);
              setValue('');
              setError(null);
            }}
          >
            {m === 'note' ? 'Note' : 'Web page'}
          </button>
        ))}
      </div>

      {mode === 'note' ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste or type a note"
          rows={5}
          aria-label="Note text"
        />
      ) : (
        <input
          type="url"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://example.com/article"
          aria-label="Page URL"
        />
      )}

      {error && <p className="error" role="alert">{error}</p>}
      <button type="submit" disabled={submitting || !value.trim()}>
        {submitting ? 'Saving…' : mode === 'note' ? 'Save note' : 'Save page'}
      </button>
    </form>
  );
}
