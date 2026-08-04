import type { CustomerServerToClientEvent, NormalisedOrder } from '@moonshot/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { fetchCustomerOrders } from '../api/orders-api.js';
import { useAuth } from '../hooks/useAuth.js';
import { getStoredToken } from '../lib/api.js';
import { useCustomerEvents } from './CustomerEventsProvider.js';

type ActiveOrdersContextValue = {
  active: NormalisedOrder[];
  recent: NormalisedOrder[];
  loading: boolean;
  /** True after the first refresh settles — guards wait on this to avoid menu flash. */
  initialised: boolean;
  refresh: () => Promise<void>;
};

const ActiveOrdersContext = createContext<ActiveOrdersContextValue | null>(null);

export function ActiveOrdersProvider({ children }: { children: ReactNode }) {
  const { isSignedIn, loading: authLoading } = useAuth();
  const { subscribe, registerOrderRoom } = useCustomerEvents();
  const [active, setActive] = useState<NormalisedOrder[]>([]);
  const [recent, setRecent] = useState<NormalisedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialised, setInitialised] = useState(false);

  const refresh = useCallback(async () => {
    if (!isSignedIn) {
      setActive([]);
      setRecent([]);
      setInitialised(true);
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
      setInitialised(true);
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
  const activeIdsKey = useMemo(() => activeIds.slice().sort().join(','), [activeIds]);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  // Register each active order room on the shared /customer connection.
  useEffect(() => {
    if (!isSignedIn || authLoading || !activeIdsKey) return;
    const token = getStoredToken()?.trim() ?? '';
    if (!token) return;

    const ids = activeIdsKey.split(',');
    const releases = ids.map((orderId) =>
      registerOrderRoom({ orderId, authToken: token }),
    );
    return () => {
      for (const release of releases) release();
    };
  }, [isSignedIn, authLoading, activeIdsKey, registerOrderRoom]);

  // Fan-in completion / status / ETA from the shared event bus.
  useEffect(() => {
    if (!isSignedIn || authLoading) return;

    return subscribe((ev: CustomerServerToClientEvent) => {
      const ids = activeIdsKey ? activeIdsKey.split(',') : [];
      if (ev.type === 'customerOrderCompleted' && ids.includes(ev.orderId)) {
        // Instant Home/Profile update on Done; list refresh follows for recent.
        setActive((prev) => prev.filter((o) => o.id !== ev.orderId));
        void refreshRef.current();
        return;
      }
      if (ev.type === 'customerOrderStatusUpdated' && ids.includes(ev.orderId)) {
        void refreshRef.current();
        return;
      }
      if (ev.type === 'customerEtaUpdated') {
        const hit = ev.updates.find((u) => ids.includes(u.orderId));
        if (hit) void refreshRef.current();
      }
    });
  }, [isSignedIn, authLoading, activeIdsKey, subscribe]);

  const value = useMemo(
    () => ({
      active,
      recent,
      loading,
      initialised,
      refresh,
    }),
    [active, recent, loading, initialised, refresh],
  );

  return <ActiveOrdersContext.Provider value={value}>{children}</ActiveOrdersContext.Provider>;
}

export function useActiveOrders(): ActiveOrdersContextValue {
  const ctx = useContext(ActiveOrdersContext);
  if (!ctx) throw new Error('useActiveOrders requires ActiveOrdersProvider');
  return ctx;
}
