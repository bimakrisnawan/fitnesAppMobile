// Small fetch wrapper for the coach dashboard: bearer token, automatic refresh on 401, typed JSON.
// Prototype note: tokens live in localStorage. Before production, move the refresh token to an
// httpOnly cookie set by the API (see docs/decisions.md).

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const ACCESS = "coach.accessToken";
const REFRESH = "coach.refreshToken";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const tokens = {
  get access() {
    return typeof window === "undefined" ? null : localStorage.getItem(ACCESS);
  },
  get refresh() {
    return typeof window === "undefined" ? null : localStorage.getItem(REFRESH);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS, access);
    localStorage.setItem(REFRESH, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  },
};

let refreshing: Promise<boolean> | null = null;

/** One refresh at a time: the API revokes every session if a refresh token is reused. */
function refreshTokens(): Promise<boolean> {
  refreshing ??= (async () => {
    try {
      const refreshToken = tokens.refresh;
      if (!refreshToken) return false;
      const res = await fetch(`${API_URL}/api/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        tokens.clear();
        return false;
      }
      const { tokens: t } = await res.json();
      tokens.set(t.accessToken, t.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}, retried = false): Promise<T> {
  const res = await fetch(`${API_URL}/api${path}`, {
    method: init.method ?? "GET",
    headers: {
      ...(init.body !== undefined && { "Content-Type": "application/json" }),
      ...(tokens.access && { Authorization: `Bearer ${tokens.access}` }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  }).catch(() => {
    throw new ApiError(0, "Can't reach the API. Is the backend running on " + API_URL + "?");
  });

  if (res.status === 401 && !retried && !path.startsWith("/auth/") && (await refreshTokens())) {
    return api<T>(path, init, true);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = body?.error ?? {};
    // Show the first field error for validation failures.
    const fields = err.details?.fieldErrors as Record<string, string[]> | undefined;
    const first = fields && Object.entries(fields).find(([, v]) => v?.length);
    throw new ApiError(res.status, first ? `${first[0]}: ${first[1][0]}` : (err.message ?? `Request failed (${res.status})`), err.code, err.details);
  }
  return body as T;
}

export const errorText = (err: unknown) => (err instanceof Error ? err.message : "Something went wrong");
