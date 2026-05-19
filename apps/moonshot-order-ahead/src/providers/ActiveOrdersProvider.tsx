import type { NormalisedOrder } from '@moonshot/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { fetchCustomerOrders } from '../api/orders-api.js';
import { useAuth } from '../hooks/useAuth.js';

type ActiveOrdersContextValue = {
  active: NormalisedOrder[];
  recent: NormalisedOrder[];
  loading: boolean;
  refresh: () => Promise<void>;
};

const ActiveOrdersContext = createContext<ActiveOrdersContextValue | null>(null);

export function ActiveOrdersProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, loading: authLoading } = useAuth();
  const [active, setActive] = useState<NormalisedOrder[]>([]);
  const [recent, setRecent] = useState<NormalisedOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!isSignedIn) {
      setActive([]);
      setRecent([]);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchCustomerOrders();
      setActive(data.active);
      setRecent(data.recent);
    } catch {
      setActive([]);
      setRecent([]);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (authLoading) return;
    void refresh();
  }, [authLoading, refresh]);

  useEffect(() => {
    if (!isSignedIn || authLoading) return;
    const id = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(id);
  }, [isSignedIn, authLoading, refresh]);

  const value = useMemo(
    () => ({
      active,
      recent,
      loading,
      refresh,
    }),
    [active, recent, loading, refresh],
  );

  return <ActiveOrdersContext.Provider value={value}>{children}</ActiveOrdersContext.Provider>;
}

export function useActiveOrders(): ActiveOrdersContextValue {
  const ctx = useContext(ActiveOrdersContext);
  if (!ctx) throw new Error('useActiveOrders requires ActiveOrdersProvider');
  return ctx;
}
