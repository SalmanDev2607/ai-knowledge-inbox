export class ApiError extends Error {
  constructor(message, { status, code, requestId } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  } catch {
    throw new ApiError('Cannot reach the server. Check that it is running.');
  }
  if (res.status === 204) return null;

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const err = body?.error;
    const fallbackMessage =
      res.status === 502 || res.status === 504
        ? 'Cannot reach the backend server. Make sure it is running on port 3001.'
        : `Request failed (${res.status})`;
    throw new ApiError(err?.message || fallbackMessage, {
      status: res.status,
      code: err?.code,
      requestId: err?.requestId,
    });
  }

  if (body === null) {
    throw new ApiError('Received an unexpected response from the server. Make sure the backend is running on port 3001.');
  }

  return body;
}

export const api = {
  listItems: () => request('/items'),
  ingest: (payload) => request('/ingest', { method: 'POST', body: JSON.stringify(payload) }),
  deleteItem: (id) => request(`/items/${id}`, { method: 'DELETE' }),
  query: (question) => request('/query', { method: 'POST', body: JSON.stringify({ question }) }),
};
