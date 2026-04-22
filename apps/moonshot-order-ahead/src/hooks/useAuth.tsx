import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, clearToken, getStoredToken } from '../lib/api.js';

type MeUser = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
};

type MeResponse = {
  user: MeUser;
  cafe: { id: string; slug: string; name: string };
  membership: {
    loyaltyStamps: number;
    totalOrders: number;
    onTimeCompletedOrders: number;
    reviewPromptState: string;
    firstVisit: string;
  } | null;
};

export type AuthContextValue = {
  user: MeUser | null;
  isSignedIn: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function useAuthState(): AuthContextValue {
  const [user, setUser] = useState<MeUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<MeResponse>('/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
      clearToken();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return useMemo(
    () => ({
      user,
      isSignedIn: Boolean(user),
      loading,
      refresh,
      signOut,
    }),
    [user, loading, refresh, signOut],
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuthState();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
