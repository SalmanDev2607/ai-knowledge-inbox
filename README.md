# Knowledge Inbox

A small RAG app. Save notes or web pages, then ask questions and get answers that cite the saved passages they came from.

- **Backend:** Node 20+, Express 5, SQLite (`better-sqlite3`), OpenAI embeddings and chat
- **Frontend:** React 18 + Vite, hooks only, no state library

## Run it locally

```bash
npm run install:all                   # installs server/ and client/
cp server/.env.example server/.env    # then set OPENAI_API_KEY
npm run dev:server                    # http://localhost:3001
npm run dev:client                    # http://localhost:5173 (proxies /api to the server)
npm test                              # unit tests for chunking, SSRF guard, HTML extraction
```

Costs are tiny: `text-embedding-3-small` plus `gpt-4o-mini`. Models and optional `OPENAI_BASE_URL` (for Ollama, OpenRouter, etc.) are configurable in `server/.env`.

## API

Errors always look like `{ "error": { "code", "message", "details?", "requestId" } }`. The same `requestId` is in the `X-Request-Id` header and every log line for that request.

| Endpoint | Purpose | Success | Errors |
|---|---|---|---|
| `POST /ingest` | Body `{type:"note", content, title?}` or `{type:"url", url}` | `202 {item}` with `status:"processing"` | `400` validation / bad JSON, `413` body too large |
| `GET /items` | List items with `status` (`processing`, `ready`, `failed`), preview, chunk count | `200 {items}` | |
| `DELETE /items/:id` | Remove an item and its chunks | `204` | `404` |
| `POST /query` | Body `{question, topK?}` | `200 {answer, sources[]}` | `400`, `502` OpenAI failure |
| `GET /health` | Liveness | `200` | |

Each source is `{ref, itemId, title, sourceType, sourceUrl, chunkPosition, score, snippet, cited}`. `ref` matches the `[n]` markers in the answer, and `cited` says whether the model actually used it.

## How it works

```
POST /ingest ──► save item (processing) ──► 202
                      │
                      └─► in-process queue ─► [fetch URL] ─► chunk ─► embed ─► save chunks + mark ready

POST /query ──► embed question ──► cosine top-k over chunks ──► LLM with numbered context ──► answer + sources
```

Code layout: `routes/` (HTTP and validation only), `services/` (chunker, embeddings, retrieval, llm, URL fetching, ingest and query orchestration), `db/` (schema and all SQL), `middleware/` (validation, logging, error mapping).

## Design decisions and tradeoffs

**Chunking.** Recursive character splitting: paragraphs first, then lines, sentences, and words. Pieces are packed up to 1,200 characters (roughly 300 tokens) with 150 characters of overlap. Small chunks keep embeddings focused, so a question about one fact is not diluted by the rest of a long page. Overlap keeps a sentence that straddles a boundary intact in at least one chunk. I chose characters over a tokenizer to avoid a dependency; the cost is imprecise token counts. Each chunk stores its item and position, which is what makes citations possible.

**Vector store.** Embeddings are float32 BLOBs in SQLite, normalised at write time. Search loads them into memory once (invalidated on any write) and computes dot products by brute force. For thousands of chunks that takes milliseconds, there is nothing extra to run, and it is easy to reason about. SQLite also gives transactional writes: chunks and the `ready` status commit together.

**Async ingestion.** URL fetching and embedding are slow and can fail, so `POST /ingest` stores the item and returns `202`. A small in-process queue (concurrency 2) does the work, and the UI polls `GET /items` only while something is `processing`. Failures are stored on the item with a readable message. On startup, items left `processing` by a crash are marked `failed` rather than hanging forever.

**Grounded answers.** The prompt restricts the model to the numbered passages, asks for inline `[n]` citations, tells it to say when the answer is not present, and treats passage text as untrusted (saved web pages can contain prompt injection). If no chunk clears the similarity threshold (`MIN_SCORE`), the LLM is not called at all, which is cheaper and cannot hallucinate.

**URL safety.** The server fetches user-supplied URLs, so it blocks private, loopback, link-local and reserved addresses, re-checks every redirect hop (max 3), enforces a 10 s timeout and a 2 MB cap, and only accepts HTML or plain text. Known gap: DNS is resolved separately from the connection, so a DNS-rebinding attacker could slip through. Production fix: connect through a pinned-IP agent or an egress proxy.

**Observability.** Structured JSON logs (pino) with a request ID, timings for retrieval and generation, and per-item ingestion logs. Status codes are specific: 400 invalid input, 404 missing, 413 too large, 502 upstream (OpenAI) failure, 500 only for our own bugs. Internal error details are logged, not returned.

## What breaks at scale

- **Brute-force search** is O(chunks) per query, and every vector sits in RAM (1,536 floats is about 6 KB per chunk). Latency and memory become a problem somewhere past a few hundred thousand chunks.
- **In-process queue** loses queued work on restart, cannot be shared across instances, and has no retries or backoff.
- **SQLite and the in-memory index** assume one server process. A second instance would have a stale index and the same file open for writing.
- **Single user, no auth**: all items are global.
- **No dedup or re-crawl**: saving the same URL twice stores it twice, and pages never refresh.
- **Changing the embedding model** invalidates every stored vector, and nothing records which model produced them.
- **Fixed top-k with no reranking**: similar chunks can crowd out diverse ones, and vector similarity alone misses exact-keyword matches.

## What I would change for production

- Postgres with **pgvector** (HNSW index), or Qdrant if search load needs to scale on its own. Store the embedding model name per chunk.
- A real queue (**BullMQ/Redis** or SQS) with retries, backoff, a dead-letter queue, and idempotent jobs. Put URL fetching in its own worker behind an egress proxy.
- Auth and per-user data scoping; rate limiting on `/query` and `/ingest`.
- Hybrid retrieval (BM25 plus vectors), reranking, and MMR for diversity. A small eval set for retrieval quality.
- Streaming answers (SSE), and Readability-based extraction for cleaner page text.
- Metrics and tracing (token usage, latency, queue depth), plus integration tests against a fake OpenAI server.
