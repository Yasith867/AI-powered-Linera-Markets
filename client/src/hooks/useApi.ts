import { useState, useCallback } from "react";

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const request = useCallback(async (url: string, options?: RequestInit): Promise<T | null> => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const data = await response.json();
      setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setState({ data: null, loading: false, error: message });
      return null;
    }
  }, []);

  const get = useCallback((url: string) => request(url), [request]);

  const post = useCallback(
    (url: string, body: unknown) =>
      request(url, { method: "POST", body: JSON.stringify(body) }),
    [request]
  );

  const patch = useCallback(
    (url: string, body?: unknown) =>
      request(url, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
    [request]
  );

  const del = useCallback((url: string) => request(url, { method: "DELETE" }), [request]);

  return { ...state, get, post, patch, del, request };
}
