import {
  KDS_SOCKET_NAMESPACE,
  type KdsAdvanceStatusRequest,
  type KdsServerToClientEvent,
  type NormalisedOrder,
  type OrderStatus,
} from '@moonshot/types';
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { type Socket, io } from 'socket.io-client';
import {
  getApiBaseUrl,
  kdsAdvanceOrderStatus,
  kdsCompleteOrder,
  kdsFetchOrders,
  kdsRecallLastOrder,
  kdsRecallOrder,
} from '../lib/kds-api.js';
import type { KdsSession } from '../lib/kds-session.js';

const STATUS_DEBOUNCE_MS = 250;

function sortOrders(orders: NormalisedOrder[]): NormalisedOrder[] {
  return [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

type AdvanceStatus = KdsAdvanceStatusRequest['status'];

type PendingStatusEntry = {
  /** Status the UI currently shows / last scheduled target. */
  target: AdvanceStatus;
  /** Status before the first optimistic write in this debounce window. */
  rollback: OrderStatus;
  timer: ReturnType<typeof setTimeout> | null;
  inFlight: boolean;
};

/**
 * Per-order status scheduler: optimistic UI, debounce coalescing, and
 * idempotent POSTs so rapid line toggles settle to one network call.
 */
function createStatusScheduler(opts: {
  getToken: () => string | null;
  setOrders: Dispatch<SetStateAction<NormalisedOrder[]>>;
  setError: (error: string | null) => void;
  onSessionExpired: () => void;
}) {
  const pending = new Map<string, PendingStatusEntry>();

  function hasPending(orderId: string): boolean {
    return pending.has(orderId);
  }

  function flush(orderId: string): void {
    const entry = pending.get(orderId);
    if (!entry || entry.inFlight) return;

    const token = opts.getToken();
    if (!token) {
      pending.delete(orderId);
      return;
    }

    entry.inFlight = true;
    entry.timer = null;
    const target = entry.target;

    void kdsAdvanceOrderStatus(token, orderId, target)
      .then(({ order }) => {
        const current = pending.get(orderId);
        if (!current) {
          opts.setOrders((prev) =>
            sortOrders([...prev.filter((o) => o.id !== order.id), order]),
          );
          return;
        }

        // A newer target was scheduled while we were in flight — apply server
        // payload fields but keep optimistic status, then flush the new target.
        if (current.target !== target) {
          current.inFlight = false;
          current.rollback = order.status;
          opts.setOrders((prev) =>
            sortOrders([
              ...prev.filter((o) => o.id !== order.id),
              { ...order, status: current.target },
            ]),
          );
          flush(orderId);
          return;
        }

        pending.delete(orderId);
        opts.setOrders((prev) =>
          sortOrders([...prev.filter((o) => o.id !== order.id), order]),
        );
      })
      .catch((err) => {
        const current = pending.get(orderId);
        const rollback = current?.rollback;
        pending.delete(orderId);

        if (rollback !== undefined) {
          opts.setOrders((prev) =>
            prev.map((o) => (o.id === orderId ? { ...o, status: rollback } : o)),
          );
        }

        if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
          opts.onSessionExpired();
          opts.setError('Session expired — please sign in again.');
        } else {
          opts.setError(err instanceof Error ? err.message : 'Status update failed');
        }
      });
  }

  function schedule(
    orderId: string,
    status: AdvanceStatus,
    currentStatus: OrderStatus | undefined,
  ): void {
    const existing = pending.get(orderId);

    // Idempotent: already showing / targeting this status — nothing to do.
    if (existing) {
      if (existing.target === status) return;
      if (existing.timer) clearTimeout(existing.timer);
      existing.target = status;
      existing.timer = setTimeout(() => flush(orderId), STATUS_DEBOUNCE_MS);
      // Optimistic UI update for the new target.
      opts.setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o)),
      );
      return;
    }

    if (currentStatus === status) return;

    pending.set(orderId, {
      target: status,
      rollback: currentStatus ?? status,
      timer: setTimeout(() => flush(orderId), STATUS_DEBOUNCE_MS),
      inFlight: false,
    });

    opts.setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o)),
    );
  }

  function clearAll(): void {
    for (const entry of pending.values()) {
      if (entry.timer) clearTimeout(entry.timer);
    }
    pending.clear();
  }

  return { schedule, hasPending, clearAll };
}

export function useKdsOrders(params: {
  session: KdsSession | null;
  onSessionExpired: (session: KdsSession) => void;
}): {
  orders: NormalisedOrder[];
  error: string | null;
  setError: (error: string | null) => void;
  dismissingIds: ReadonlySet<string>;
  complete: (orderId: string) => void;
  finalizeDismiss: (orderId: string) => void;
  recallLast: () => void;
  recalling: boolean;
  recallOrder: (orderId: string) => Promise<void>;
  setStatus: (orderId: string, status: KdsAdvanceStatusRequest['status']) => void;
} {
  const { session, onSessionExpired } = params;
  const [orders, setOrders] = useState<NormalisedOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(() => new Set());
  const [recalling, setRecalling] = useState(false);
  const recallingIdsRef = useRef<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);
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

  const applyEvent = useCallback(
    (ev: KdsServerToClientEvent) => {
      setOrders((prev) => {
        switch (ev.type) {
          case 'kds:order:new':
            return sortOrders([...prev.filter((o) => o.id !== ev.order.id), ev.order]);
          case 'kds:order:removed':
            return prev.filter((o) => o.id !== ev.orderId);
          case 'kds:order:updated':
            // Don't resurrect a card mid-dismiss animation.
            if (dismissingRef.current.has(ev.order.id)) return prev;
            // Preserve optimistic status while a debounce/in-flight update is pending.
            if (scheduler.hasPending(ev.order.id)) {
              const local = prev.find((o) => o.id === ev.order.id);
              const merged = local
                ? { ...ev.order, status: local.status }
                : ev.order;
              return sortOrders([...prev.filter((o) => o.id !== ev.order.id), merged]);
            }
            return sortOrders([...prev.filter((o) => o.id !== ev.order.id), ev.order]);
          case 'kds:eta:updated':
            return prev.map((o) => {
              const u = ev.updates.find((x) => x.orderId === o.id);
              if (!u) return o;
              return {
                ...o,
                pickup: { ...o.pickup, pickupTime: u.pickupTime },
              };
            });
          default:
            return prev;
        }
      });
      if (ev.type === 'kds:order:removed') {
        setDismissingIds((prev) => {
          if (!prev.has(ev.orderId)) return prev;
          const next = new Set(prev);
          next.delete(ev.orderId);
          return next;
        });
      }
    },
    [scheduler],
  );

  const refreshOrders = useCallback(
    async (token: string) => {
      const data = await kdsFetchOrders(token);
      setOrders((prev) => {
        // Keep locally-dismissing cards so the collapse animation can finish.
        const dismissing = dismissingRef.current;
        const byId = new Map(data.orders.map((o) => [o.id, o]));
        const merged = prev
          .filter((o) => dismissing.has(o.id) || byId.has(o.id))
          .map((o) => {
            if (dismissing.has(o.id)) return o;
            const remote = byId.get(o.id)!;
            // Preserve optimistic status during pending status updates.
            if (scheduler.hasPending(o.id)) {
              return { ...remote, status: o.status };
            }
            return remote;
          });
        for (const o of data.orders) {
          if (!merged.some((m) => m.id === o.id)) merged.push(o);
        }
        return sortOrders(merged);
      });
    },
    [scheduler],
  );

  useEffect(() => {
    if (!session) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      scheduler.clearAll();
      setOrders([]);
      setDismissingIds(new Set());
      setRecalling(false);
      return;
    }

    const base = getApiBaseUrl();
    if (!base) {
      setError('VITE_API_URL is not set');
      return;
    }

    setError(null);
    void refreshOrders(session.token).catch((e) => {
      if (e instanceof Error && e.message === 'SESSION_EXPIRED') {
        onExpiredRef.current(session);
        setError('Session expired — please sign in again.');
        return;
      }
      setError(e instanceof Error ? e.message : 'Failed to load orders');
    });

    const socket = io(`${base}${KDS_SOCKET_NAMESPACE}`, {
      auth: { token: session.token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setError(null);
      void refreshOrders(session.token).catch((e) => {
        if (e instanceof Error && e.message === 'SESSION_EXPIRED') {
          onExpiredRef.current(session);
          setError('Session expired — please sign in again.');
        }
      });
    });

    socket.on('kds:event', (ev: KdsServerToClientEvent) => {
      applyEvent(ev);
    });

    socket.on('disconnect', () => {
      setError((prev) => prev ?? 'Socket disconnected — reconciling periodically');
    });

    const interval = window.setInterval(() => {
      void refreshOrders(session.token).catch((e) => {
        if (e instanceof Error && e.message === 'SESSION_EXPIRED') {
          onExpiredRef.current(session);
          setError('Session expired — please sign in again.');
        }
      });
    }, 90_000);

    return () => {
      window.clearInterval(interval);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session, applyEvent, refreshOrders, scheduler]);

  const finalizeDismiss = useCallback((orderId: string): void => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    setDismissingIds((prev) => {
      if (!prev.has(orderId)) return prev;
      const next = new Set(prev);
      next.delete(orderId);
      return next;
    });
  }, []);

  const complete = useCallback(
    (orderId: string): void => {
      if (!session) return;
      if (dismissingRef.current.has(orderId)) return;

      setDismissingIds((prev) => {
        const next = new Set(prev);
        next.add(orderId);
        return next;
      });
      setError(null);

      void kdsCompleteOrder(session.token, orderId).catch((err) => {
        // Roll back the collapse so the card expands back into the board.
        setDismissingIds((prev) => {
          if (!prev.has(orderId)) return prev;
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
        if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
          onExpiredRef.current(session);
          setError('Session expired — please sign in again.');
        } else {
          setError(err instanceof Error ? err.message : 'Complete failed');
        }
      });
    },
    [session],
  );

  const recallLast = useCallback((): void => {
    if (!session || recalling) return;
    setRecalling(true);
    setError(null);

    void kdsRecallLastOrder(session.token)
      .then(({ order }) => {
        setDismissingIds((prev) => {
          if (!prev.has(order.id)) return prev;
          const next = new Set(prev);
          next.delete(order.id);
          return next;
        });
        setOrders((prev) => sortOrders([...prev.filter((o) => o.id !== order.id), order]));
      })
      .catch((err) => {
        if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
          onExpiredRef.current(session);
          setError('Session expired — please sign in again.');
        } else {
          setError(err instanceof Error ? err.message : 'Recall failed');
        }
      })
      .finally(() => {
        setRecalling(false);
      });
  }, [session, recalling]);

  const recallOrder = useCallback(
    async (orderId: string): Promise<void> => {
      if (!session) return;
      if (recallingIdsRef.current.has(orderId)) return;

      recallingIdsRef.current.add(orderId);
      setError(null);

      try {
        const { order } = await kdsRecallOrder(session.token, orderId);
        setDismissingIds((prev) => {
          if (!prev.has(order.id)) return prev;
          const next = new Set(prev);
          next.delete(order.id);
          return next;
        });
        setOrders((prev) => sortOrders([...prev.filter((o) => o.id !== order.id), order]));
      } catch (err) {
        if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
          onExpiredRef.current(session);
          setError('Session expired — please sign in again.');
        } else {
          setError(err instanceof Error ? err.message : 'Recall failed');
        }
        throw err;
      } finally {
        recallingIdsRef.current.delete(orderId);
      }
    },
    [session],
  );

  const setStatus = useCallback(
    (orderId: string, status: KdsAdvanceStatusRequest['status']): void => {
      if (!session) return;
      setError(null);
      const current = ordersRef.current.find((o) => o.id === orderId);
      scheduler.schedule(orderId, status, current?.status);
    },
    [session, scheduler],
  );

  return {
    orders,
    error,
    setError,
    dismissingIds,
    complete,
    finalizeDismiss,
    recallLast,
    recalling,
    recallOrder,
    setStatus,
  };
}
