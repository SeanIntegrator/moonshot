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
import {
  useActiveOrderSockets,
  type ActiveOrderSocketChange,
} from '../hooks/useActiveOrderSockets.js';
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

  // Reliability fallback — socket is the fast path for KDS completion / status.
  useEffect(() => {
    if (!isSignedIn || authLoading) return;
    const id = window.setInterval(() => void refresh(), 30_000);
    return () => window.clearInterval(id);
  }, [isSignedIn, authLoading, refresh]);

  const activeIds = useMemo(() => active.map((o) => o.id), [active]);

  const onSocketOrderChanged = useCallback(
    (change: ActiveOrderSocketChange) => {
      // Instant Home/Profile update on Done; status/ETA still need a list refresh.
      if (change.kind === 'completed') {
        setActive((prev) => prev.filter((o) => o.id !== change.orderId));
      }
      void refresh();
    },
    [refresh],
  );

  useActiveOrderSockets(activeIds, isSignedIn && !authLoading, onSocketOrderChanged);

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
