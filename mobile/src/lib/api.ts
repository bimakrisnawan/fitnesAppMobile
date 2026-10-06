import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { API_URL } from "./config";
import { tokenStorage } from "./token-storage";

export interface AuthTokens {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
}

export interface ApiErrorBody {
  error: { message: string; code?: string };
}

let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

/** Called once by the auth store so the API layer can sign the user out without importing the store. */
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

export const api = axios.create({ baseURL: `${API_URL}/api`, timeout: 15_000 });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

// Single-flight refresh: the server revokes all sessions if a refresh token is used twice,
// so concurrent 401s must share one refresh call.
let refreshInFlight: Promise<string | null> | null = null;

export function refreshSession(): Promise<string | null> {
  refreshInFlight ??= (async () => {
    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!refreshToken) return null;
      const { data } = await axios.post<{ tokens: AuthTokens }>(`${API_URL}/api/auth/refresh-token`, { refreshToken });
      await tokenStorage.setRefreshToken(data.tokens.refreshToken);
      setAccessToken(data.tokens.accessToken);
      return data.tokens.accessToken;
    } catch (err) {
      // Only a rejected token ends the session; a network failure shouldn't log the user out.
      if (err instanceof AxiosError && err.response?.status === 401) {
        await tokenStorage.clear();
        setAccessToken(null);
      }
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

api.interceptors.response.use(undefined, async (error: AxiosError) => {
  const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;
  // A 401 from /auth/* (e.g. wrong password) is a real answer, not an expired access token.
  if (error.response?.status !== 401 || !original || original._retried || original.url?.startsWith("/auth/")) {
    throw error;
  }

  original._retried = true;
  const token = await refreshSession();
  if (!token) {
    onSessionExpired?.();
    throw error;
  }
  original.headers.Authorization = `Bearer ${token}`;
  return api(original);
});

export function errorMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    const body = err.response?.data as ApiErrorBody | undefined;
    if (body?.error?.message) return body.error.message;
    if (!err.response) return "Can't reach the server. Check your connection.";
  }
  return "Something went wrong. Please try again.";
}
