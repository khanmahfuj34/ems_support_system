"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { getCurrentUser, login as loginRequest, logout as clearSession } from "@/features/auth/services/auth.service";
import { getAccessToken } from "@/features/auth/services/token";
import type { AuthUser, UserProfile } from "@/features/auth/types/auth.types";
import type { LoginValues } from "@/features/auth/schemas/auth.schema";

type AuthStatus = "checking" | "authenticated" | "unauthenticated" | "error";

type AuthContextValue = {
  user: AuthUser | null;
  status: AuthStatus;
  login: (credentials: Pick<LoginValues, "email" | "password">) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<UserProfile>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("checking");
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    try {
      const profile = await getCurrentUser();
      setUser(profile);
      setStatus("authenticated");
      return profile;
    } catch (error) {
      if ((error as { response?: { status?: number } }).response?.status === 401) {
        clearSession();
        setUser(null);
        setStatus("unauthenticated");
      } else {
        setStatus("error");
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    if (!getAccessToken()) {
      const frame = window.requestAnimationFrame(() => setStatus("unauthenticated"));
      return () => window.cancelAnimationFrame(frame);
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshUser().catch(() => undefined);
  }, [refreshUser]);

  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setStatus("unauthenticated");

      const { pathname, search } = window.location;
      if (pathname !== "/login") {
        router.replace(`/login?next=${encodeURIComponent(`${pathname}${search}`)}`);
      }
    };

    window.addEventListener("supportdesk:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("supportdesk:unauthorized", handleUnauthorized);
  }, [router]);

  const login = useCallback(async (credentials: Pick<LoginValues, "email" | "password">) => {
    const loggedInUser = await loginRequest(credentials);
    setUser(loggedInUser);
    setStatus("authenticated");
    return loggedInUser;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setStatus("unauthenticated");
    router.replace("/login");
  }, [router]);

  const value = useMemo(
    () => ({ user, status, login, logout, refreshUser }),
    [user, status, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
