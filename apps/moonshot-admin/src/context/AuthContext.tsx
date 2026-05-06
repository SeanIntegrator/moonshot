import type { AdminLoginResponse } from '@moonshot/types';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { adminGetMe, adminLogin, getApiBaseUrl } from '../lib/admin-api.js';

const TOKEN_KEY = 'moonshot_admin_token';

export type AdminSession = Pick<AdminLoginResponse, 'token' | 'adminUser' | 'cafe'>;

type AuthContextValue = {
  session: AdminSession | null;
  /** True while checking stored token on mount */
  loading: boolean;
  apiConfigured: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);
  const apiConfigured = Boolean(getApiBaseUrl());

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (!getApiBaseUrl()) {
        setLoading(false);
        return;
      }
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const me = await adminGetMe(token);
        if (cancelled) return;
        setSession({ token, ...me });
      } catch {
        if (cancelled) return;
        localStorage.removeItem(TOKEN_KEY);
        setSession(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await adminLogin(email, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    setSession({
      token: data.token,
      adminUser: data.adminUser,
      cafe: data.cafe,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setSession(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      apiConfigured,
      login,
      logout,
    }),
    [session, loading, apiConfigured, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
