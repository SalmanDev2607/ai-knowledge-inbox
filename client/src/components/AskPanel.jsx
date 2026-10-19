import { useState } from 'react';
import { useAsk } from '../hooks/useAsk.js';

function Source({ source }) {
  return (
    <li className={source.cited ? 'source cited' : 'source'}>
      <div className="source-head">
        <span className="ref">[{source.ref}]</span>
        <strong>
          {source.sourceUrl ? (
            <a href={source.sourceUrl} target="_blank" rel="noreferrer">{source.title}</a>
          ) : (
            source.title
          )}
        </strong>
        <span className="muted">
          match {Math.round(source.score * 100)}%{source.cited ? ', cited in answer' : ''}
        </span>
      </div>
      <p className="snippet">{source.snippet}</p>
    </li>
  );
}

export default function AskPanel({ hasReadyItems }) {
  const [question, setQuestion] = useState('');
  const { status, result, error, ask } = useAsk();

  function handleSubmit(event) {
    event.preventDefault();
    if (question.trim()) ask(question);
  }

  return (
    <section className="panel">
      <h2>Ask your saved content</h2>
      <form onSubmit={handleSubmit} className="ask-form">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What do my notes say about…?"
          aria-label="Question"
        />
        <button type="submit" disabled={status === 'loading' || !question.trim() || !hasReadyItems}>
          {status === 'loading' ? 'Thinking…' : 'Ask'}
        </button>
      </form>
      {!hasReadyItems && <p className="muted">Save something and wait for it to finish indexing first.</p>}

      {status === 'error' && <p className="error" role="alert">{error}</p>}

      {status === 'done' && result && (
        <div className="answer" aria-live="polite">
          <p className="answer-text">{result.answer}</p>
          {result.sources?.length > 0 && (
            <>
              <h3>Sources</h3>
              <ul className="sources">
                {result.sources.map((s) => (
                  <Source key={s.ref} source={s} />
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}
