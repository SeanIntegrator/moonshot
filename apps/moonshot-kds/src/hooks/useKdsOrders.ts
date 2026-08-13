import type { KdsAdvanceStatusRequest, NormalisedOrder } from '@moonshot/types';
import type { RealtimeStatus } from '@moonshot/web-runtime';
import { useCallback, useEffect, useRef, useState } from 'react';
import { kdsCompleteOrder, kdsFetchOrders, kdsRecallOrder } from '../lib/kds-api.js';
import { toOptimisticRecalledOrder, unselectedLineIds } from '../lib/kds-recall.js';
import {
  applyKdsEvent,
  mergeRemoteOrders,
  sortOrders,
  type OrdersStoreContext,
} from '../lib/orders-store.js';
import type { KdsSession } from '../lib/kds-session.js';
import { createStatusScheduler } from './kds-status-scheduler.js';
import { useKdsRealtime } from './useKdsRealtime.js';

const POLL_HEALTHY_MS = 90_000;
const POLL_DEGRADED_MS = 10_000;

export function useKdsOrders(params: {
  session: KdsSession | null;
  onSessionExpired: (session: KdsSession) => void;
}): {
  orders: NormalisedOrder[];
  error: string | null;
  setError: (error: string | null) => void;
  connection: RealtimeStatus;
  dismissingIds: ReadonlySet<string>;
  recallSelections: ReadonlyMap<string, ReadonlySet<string>>;
  complete: (orderId: string) => void;
  finalizeDismiss: (orderId: string) => void;
  recallOrder: (order: NormalisedOrder, opts: { lineIds: string[] }) => Promise<void>;
  setStatus: (orderId: string, status: KdsAdvanceStatusRequest['status']) => void;
} {
  const { session, onSessionExpired } = params;
  const [orders, setOrders] = useState<NormalisedOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(() => new Set());
  const [recallSelections, setRecallSelections] = useState<Map<string, ReadonlySet<string>>>(
    () => new Map(),
  );
  const recallingIdsRef = useRef<Set<string>>(new Set());
  const pendingRecallIdsRef = useRef<Set<string>>(new Set());
  const onExpiredRef = useRef(onSessionExpired);
  onExpiredRef.current = onSessionExpired;
  const dismissingRef = useRef(dismissingIds);
  dismissingRef.current = dismissingIds;
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const ordersRef = useRef(orders);
  ordersRef.current = orders;

  const schedulerRef = useRef<ReturnType<typeof createStatusScheduler> | null>(null);
  if (!schedulerRef.current) {
    schedulerRef.current = createStatusScheduler({
      getToken: () => sessionRef.current?.token ?? null,
      setOrders,
      setError,
      onSessionExpired: () => {
        const s = sessionRef.current;
        if (s) onExpiredRef.current(s);
      },
    });
  }
  const scheduler = schedulerRef.current;

  const storeCtx = useCallback((): OrdersStoreContext => {
    return {
      isProtected: (id) =>
        dismissingRef.current.has(id) || pendingRecallIdsRef.current.has(id),
      hasPending: scheduler.hasPending,
    };
  }, [scheduler]);

  const dropRecallSelection = useCallback((orderId: string): void => {
    setRecallSelections((prev) => {
      if (!prev.has(orderId)) return prev;
      const next = new Map(prev);
      next.delete(orderId);
      return next;
    });
  }, []);

  const handleExpired = useCallback((err: unknown, fallback: string): void => {
    if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
      const s = sessionRef.current;
      if (s) onExpiredRef.current(s);
      setError('Session expired — please sign in again.');
      return;
    }
    setError(err instanceof Error ? err.message : fallback);
  }, []);

  const applyEvent = useCallback(
    (ev: Parameters<typeof applyKdsEvent>[1]) => {
      setOrders((prev) => applyKdsEvent(prev, ev, storeCtx()));
      if (ev.type === 'kds:order:removed') {
        setDismissingIds((prev) => {
          if (!prev.has(ev.orderId)) return prev;
          const next = new Set(prev);
          next.delete(ev.orderId);
          return next;
        });
        dropRecallSelection(ev.orderId);
      }
    },
    [storeCtx, dropRecallSelection],
  );

  const refreshOrders = useCallback(
    async (token: string) => {
      const data = await kdsFetchOrders(token);
      setOrders((prev) => mergeRemoteOrders(prev, data.orders, storeCtx()));
    },
    [storeCtx],
  );

  const resync = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    void refreshOrders(s.token).catch((e) => handleExpired(e, 'Failed to load orders'));
  }, [refreshOrders, handleExpired]);

  const onAuthError = useCallback(() => {
    const s = sessionRef.current;
    if (s) onExpiredRef.current(s);
    setError('Session expired — please sign in again.');
  }, []);

  const { status: connection, isConnected } = useKdsRealtime({
    enabled: Boolean(session),
    token: session?.token ?? null,
    onEvent: applyEvent,
    onResync: resync,
    onAuthError,
  });

  useEffect(() => {
    if (!session) {
      scheduler.clearAll();
      pendingRecallIdsRef.current.clear();
      setOrders([]);
      setDismissingIds(new Set());
      setRecallSelections(new Map());
      return;
    }

    setError(null);
    void refreshOrders(session.token).catch((e) => handleExpired(e, 'Failed to load orders'));
  }, [session, refreshOrders, scheduler, handleExpired]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = (): void => {
      const delay = isConnected ? POLL_HEALTHY_MS : POLL_DEGRADED_MS;
      timer = setTimeout(() => {
        void refreshOrders(session.token)
          .catch((e) => handleExpired(e, 'Failed to load orders'))
          .finally(() => {
            if (!cancelled) tick();
          });
      }, delay);
    };
    tick();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [session, isConnected, refreshOrders, handleExpired]);

  const finalizeDismiss = useCallback((orderId: string): void => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    setDismissingIds((prev) => {
      if (!prev.has(orderId)) return prev;
      const next = new Set(prev);
      next.delete(orderId);
      return next;
    });
    dropRecallSelection(orderId);
  }, [dropRecallSelection]);

  const complete = useCallback((orderId: string): void => {
    if (!sessionRef.current) return;
    if (dismissingRef.current.has(orderId)) return;

    setDismissingIds((prev) => {
      const next = new Set(prev);
      next.add(orderId);
      return next;
    });
    setError(null);

    void kdsCompleteOrder(sessionRef.current.token, orderId).catch((err) => {
      setDismissingIds((prev) => {
        if (!prev.has(orderId)) return prev;
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
      handleExpired(err, 'Complete failed');
    });
  }, [handleExpired]);

  const recallOrder = useCallback(
    async (order: NormalisedOrder, opts: { lineIds: string[] }): Promise<void> => {
      const s = sessionRef.current;
      if (!s) return;
      if (opts.lineIds.length === 0) return;
      if (recallingIdsRef.current.has(order.id)) return;

      recallingIdsRef.current.add(order.id);
      pendingRecallIdsRef.current.add(order.id);
      setError(null);

      const unselected = unselectedLineIds(order, opts.lineIds);
      setRecallSelections((prev) => {
        const next = new Map(prev);
        if (unselected.size === 0) next.delete(order.id);
        else next.set(order.id, unselected);
        return next;
      });
      setDismissingIds((prev) => {
        if (!prev.has(order.id)) return prev;
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
      const optimistic = toOptimisticRecalledOrder(order);
      setOrders((prev) => sortOrders([...prev.filter((o) => o.id !== order.id), optimistic]));

      try {
        const { order: server } = await kdsRecallOrder(s.token, order.id, {
          lineIds: opts.lineIds,
        });
        setOrders((prev) => {
          pendingRecallIdsRef.current.delete(order.id);
          return sortOrders([...prev.filter((o) => o.id !== server.id), server]);
        });
      } catch (err) {
        pendingRecallIdsRef.current.delete(order.id);
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
        dropRecallSelection(order.id);
        handleExpired(err, 'Recall failed');
        throw err;
      } finally {
        recallingIdsRef.current.delete(order.id);
      }
    },
    [handleExpired, dropRecallSelection],
  );

  const setStatus = useCallback(
    (orderId: string, status: KdsAdvanceStatusRequest['status']): void => {
      if (!sessionRef.current) return;
      setError(null);
      const current = ordersRef.current.find((o) => o.id === orderId);
      scheduler.schedule(orderId, status, current?.status);
    },
    [scheduler],
  );

  return {
    orders,
    error,
    setError,
    connection,
    dismissingIds,
    recallSelections,
    complete,
    finalizeDismiss,
    recallOrder,
    setStatus,
  };
}
