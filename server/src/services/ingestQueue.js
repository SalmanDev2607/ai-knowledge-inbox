import { logger } from '../logger.js';

// Minimal in-process job queue. Good enough for one process; see README for what replaces it.
const CONCURRENCY = 2;
const pending = [];
let running = 0;

export function enqueue(name, job) {
  pending.push({ name, job });
  drain();
}

function drain() {
  while (running < CONCURRENCY && pending.length > 0) {
    const { name, job } = pending.shift();
    running++;
    Promise.resolve()
      .then(job)
      .catch((err) => logger.error({ err, job: name }, 'queue job crashed'))
      .finally(() => {
        running--;
        drain();
      });
  }
}
