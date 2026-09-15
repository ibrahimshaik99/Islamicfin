import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../lib/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>(path: string | null) {
  const [state, setState] = useState<UseApiState<T>>({ data: null, loading: !!path, error: null });

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    if (!path) return;
    setState({ data: null, loading: true, error: null });
    try {
      const res = await api<T>(path, { signal });
      if (signal?.aborted) return;
      // Auto-unwrap { data: ... } wrapper from API responses
      const unwrapped = (res && typeof res === 'object' && 'data' in res && !(res instanceof Array))
        ? (res as unknown as { data: T }).data
        : res;
      setState({ data: unwrapped, loading: false, error: null });
    } catch (err) {
      if (signal?.aborted) return;
      if (err instanceof ApiError) {
        setState({ data: null, loading: false, error: err.message });
      } else {
        setState({ data: null, loading: false, error: 'An unexpected error occurred' });
      }
    }
  }, [path]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const refetch = useCallback(() => fetchData(), [fetchData]);

  return { ...state, refetch };
}

interface UseMutationState {
  loading: boolean;
  error: string | null;
}

export function useMutation<T = unknown>() {
  const [state, setState] = useState<UseMutationState>({ loading: false, error: null });

  const mutate = useCallback(async (path: string, options: { method?: string; body?: unknown } = {}): Promise<T | null> => {
    setState({ loading: true, error: null });
    try {
      const result = await api<T>(path, { method: options.method || 'POST', body: options.body });
      setState({ loading: false, error: null });
      return result;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'An unexpected error occurred';
      setState({ loading: false, error: message });
      return null;
    }
  }, []);

  const resetError = useCallback(() => setState((s) => ({ ...s, error: null })), []);

  return { ...state, mutate, resetError };
}
