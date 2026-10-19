import { useCallback, useState } from 'react';
import { api } from '../api.js';

export function useAsk() {
  const [state, setState] = useState({ status: 'idle', result: null, error: null });

  const ask = useCallback(async (question) => {
    setState({ status: 'loading', result: null, error: null });
    try {
      const result = await api.query(question);
      setState({ status: 'done', result, error: null });
    } catch (err) {
      setState({ status: 'error', result: null, error: err.message });
    }
  }, []);

  return { ...state, ask };
}
