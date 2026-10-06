"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { api, ApiError, tokens } from "./api";

export interface CoachMe {
  id: string;
  fullName: string;
  email: string;
  role: "COACH" | "ADMIN" | "CLIENT";
  coachProfile: { specialization: string; bio: string | null; experienceYears: number | null } | null;
}

interface AuthValue {
  me: CoachMe | null;
  status: "loading" | "signedIn" | "signedOut";
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<CoachMe | null>(null);
  const [status, setStatus] = useState<AuthValue["status"]>("loading");

  const loadMe = useCallback(async () => {
    try {
      const { coach } = await api<{ coach: CoachMe }>("/coach/me");
      setMe(coach);
      setStatus("signedIn");
    } catch {
      setMe(null);
      setStatus("signedOut");
    }
  }, []);

  useEffect(() => {
    // Restoring the session from localStorage can only happen in the browser, after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!tokens.refresh) setStatus("signedOut");
    else void loadMe();
  }, [loadMe]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api<{ user: { role: string }; tokens: { accessToken: string; refreshToken: string } }>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      if (res.user.role === "CLIENT") {
        await api("/auth/logout", { method: "POST", body: { refreshToken: res.tokens.refreshToken } }).catch(() => {});
        throw new ApiError(403, "This dashboard is for coaches. Clients use the mobile app.");
      }
      tokens.set(res.tokens.accessToken, res.tokens.refreshToken);
      await loadMe();
    },
    [loadMe],
  );

  const logout = useCallback(async () => {
    const refreshToken = tokens.refresh;
    if (refreshToken) await api("/auth/logout", { method: "POST", body: { refreshToken } }).catch(() => {});
    tokens.clear();
    setMe(null);
    setStatus("signedOut");
  }, []);

  return <AuthContext.Provider value={{ me, status, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside <AuthProvider>");
  return value;
}
