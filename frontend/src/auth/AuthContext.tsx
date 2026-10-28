import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";

import { fetchMe, getAuthToken, login as apiLogin, logout as apiLogout, setAuthToken } from "../api/client";
import type { CurrentUser } from "../types";

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  function clearSession() {
    setAuthToken(null);
    setUser(null);
  }

  useEffect(() => {
    if (!getAuthToken()) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => clearSession())
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function handleUnauthorized() {
      clearSession();
    }
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, []);

  async function login(username: string, password: string) {
    const result = await apiLogin(username, password);
    setAuthToken(result.token);
    setUser(result);
  }

  async function logout() {
    try {
      await apiLogout();
    } catch {
      // ignore - we're clearing the local session regardless
    }
    clearSession();
  }

  async function refreshUser() {
    const me = await fetchMe();
    setUser(me);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
