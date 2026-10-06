import { create } from "zustand";
import { api, type AuthTokens, refreshSession, setAccessToken, setSessionExpiredHandler } from "../lib/api";
import { tokenStorage } from "../lib/token-storage";

export type Role = "CLIENT" | "COACH" | "ADMIN";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  birthYear: number | null;
  fitnessLevel: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | null;
  goals: string | null;
  preferredSpecialization: "RUNNING" | "SWIMMING" | "GENERAL" | null;
  hasPhone: boolean;
}

type Status = "loading" | "signedOut" | "signedIn";

interface AuthState {
  status: Status;
  user: User | null;
  restore: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-reads the profile after the server changed it (e.g. phone saved during checkout). */
  refreshUser: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => {
  async function startSession(user: User, tokens: AuthTokens) {
    await tokenStorage.setRefreshToken(tokens.refreshToken);
    setAccessToken(tokens.accessToken);
    set({ status: "signedIn", user });
  }

  setSessionExpiredHandler(() => set({ status: "signedOut", user: null }));

  return {
    status: "loading",
    user: null,

    restore: async () => {
      const token = await refreshSession();
      if (!token) return set({ status: "signedOut" });
      try {
        const { data } = await api.get<{ user: User }>("/users/profile");
        set({ status: "signedIn", user: data.user });
      } catch {
        set({ status: "signedOut" });
      }
    },

    login: async (email, password) => {
      const { data } = await api.post<{ user: User; tokens: AuthTokens }>("/auth/login", { email, password });
      await startSession(data.user, data.tokens);
    },

    register: async (fullName, email, password) => {
      const { data } = await api.post<{ user: User; tokens: AuthTokens }>("/auth/register", {
        fullName,
        email,
        password,
      });
      await startSession(data.user, data.tokens);
    },

    refreshUser: async () => {
      const { data } = await api.get<{ user: User }>("/users/profile");
      set({ user: data.user });
    },

    logout: async () => {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (refreshToken) await api.post("/auth/logout", { refreshToken }).catch(() => {});
      await tokenStorage.clear();
      setAccessToken(null);
      set({ status: "signedOut", user: null });
    },
  };
});
