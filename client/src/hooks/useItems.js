import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';

const POLL_INTERVAL_MS = 2000;

/** Loads saved items and polls only while something is still being indexed. */
export function useItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.listItems();
      setItems(data?.items || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const hasPending = items.some((item) => item.status === 'processing');
  useEffect(() => {
    if (!hasPending) return undefined;
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [hasPending, refresh]);

  // Errors from add/remove propagate so the calling form can show them next to the action.
  const addItem = useCallback(
    async (payload) => {
      await api.ingest(payload);
      await refresh();
    },
    [refresh]
  );

  const removeItem = useCallback(
    async (id) => {
      await api.deleteItem(id);
      await refresh();
    },
    [refresh]
  );

  return { items, loading, error, addItem, removeItem };
}
