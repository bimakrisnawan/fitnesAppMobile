import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { api, errorMessage } from "./api";

/**
 * GETs `path` whenever the screen comes into focus (so data is fresh after you log something
 * elsewhere), with loading/error state and a manual `refresh` for pull-to-refresh.
 * Pass `null` to skip fetching.
 */
export function useFetch<T>(path: string | null, params?: Record<string, string | number | undefined>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [refreshing, setRefreshing] = useState(false);
  const paramsKey = JSON.stringify(params ?? {});
  const latest = useRef(0);
  const hasData = useRef(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (path === null) return;
      const requestId = ++latest.current;
      if (isRefresh) setRefreshing(true);
      else if (!hasData.current) setLoading(true);
      try {
        const res = await api.get<T>(path, { params: JSON.parse(paramsKey) });
        // Ignore responses that arrive after a newer request (e.g. fast typing in search).
        if (requestId === latest.current) {
          setData(res.data);
          hasData.current = true;
          setError(null);
        }
      } catch (err) {
        if (requestId === latest.current) setError(errorMessage(err));
      } finally {
        if (requestId === latest.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [path, paramsKey],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return { data, error, loading, refreshing, refresh: () => load(true), setData };
}
