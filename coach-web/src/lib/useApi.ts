"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorText } from "./api";

/** GETs `path` on mount and whenever it changes. `reload()` refetches after a mutation. */
export function useApi<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(path !== null);

  const reload = useCallback(async () => {
    if (!path) return;
    try {
      setData(await api<T>(path));
      setError(null);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [path]);

  // Fetch on mount / path change. State is set in promise callbacks (not synchronously), and a
  // response for a path we've since navigated away from is ignored.
  useEffect(() => {
    if (!path) return;
    let active = true;
    api<T>(path)
      .then(
        (result) => {
          if (!active) return;
          setData(result);
          setError(null);
        },
        (err) => active && setError(errorText(err)),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [path]);

  return { data, error, loading, reload };
}
