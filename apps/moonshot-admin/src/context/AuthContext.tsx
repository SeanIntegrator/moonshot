import type { AdminLoginResponse, AdminOnboardingStatusResponse, AdminRegisterRequest } from '@moonshot/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  adminGetMe,
  adminLogin,
  adminOnboardingStatus,
  adminRegister,
  getApiBaseUrl,
} from '../lib/admin-api.js';

const TOKEN_KEY = 'moonshot_admin_token';

export type AdminSession = Pick<AdminLoginResponse, 'token' | 'adminUser' | 'cafe'>;

type AuthContextValue = {
  session: AdminSession | null;
  onboardingStatus: AdminOnboardingStatusResponse | null;
  loading: boolean;
  apiConfigured: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (body: AdminRegisterRequest) => Promise<void>;
  logout: () => void;
  refreshOnboardingStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Resolve onboarding status before persisting the token and publishing session.
 * Avoids a race where session alone briefly unlocks ConsoleLayout, and avoids
 * leaving an orphaned JWT if status cannot be loaded after login/register.
 */
async function establishSession(
  data: AdminLoginResponse,
  setSession: (s: AdminSession | null) => void,
  setOnboardingStatus: (s: AdminOnboardingStatusResponse | null) => void,
): Promise<void> {
  const status = await adminOnboardingStatus(data.token);
  localStorage.setItem(TOKEN_KEY, data.token);
  setOnboardingStatus(status);
  setSession({
    token: data.token,
    adminUser: data.adminUser,
    cafe: data.cafe,
  });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [onboardingStatus, setOnboardingStatus] = useState<AdminOnboardingStatusResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const apiConfigured = Boolean(getApiBaseUrl());

  const refreshOnboardingStatus = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setOnboardingStatus(null);
      return;
    }
    try {
      const status = await adminOnboardingStatus(token);
      setOnboardingStatus(status);
    } catch {
      // Keep last known status. Clearing it while a session exists replaces the
      // whole app with AuthBootSpinner and leaves no retry/logout path.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (!getApiBaseUrl()) {
        if (!cancelled) setLoading(false);
        return;
      }
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const me = await adminGetMe(token);
        if (cancelled) return;
        const status = await adminOnboardingStatus(token);
        if (cancelled) return;
        // Publish session + status together so routing never sees a half-ready signed-in state.
        setOnboardingStatus(status);
        setSession({ token, ...me });
      } catch {
        if (cancelled) return;
        localStorage.removeItem(TOKEN_KEY);
        setSession(null);
        setOnboardingStatus(null);
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
    await establishSession(data, setSession, setOnboardingStatus);
  }, []);

  const register = useCallback(async (body: AdminRegisterRequest) => {
    const data = await adminRegister(body);
    await establishSession(data, setSession, setOnboardingStatus);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setSession(null);
    setOnboardingStatus(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      onboardingStatus,
      loading,
      apiConfigured,
      login,
      register,
      logout,
      refreshOnboardingStatus,
    }),
    [session, onboardingStatus, loading, apiConfigured, login, register, logout, refreshOnboardingStatus],
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
