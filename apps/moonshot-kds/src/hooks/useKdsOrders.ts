import {
  KDS_SOCKET_NAMESPACE,
  type KdsAdvanceStatusRequest,
  type KdsServerToClientEvent,
  type NormalisedOrder,
} from '@moonshot/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type Socket, io } from 'socket.io-client';
import {
  getApiBaseUrl,
  kdsAdvanceOrderStatus,
  kdsCompleteOrder,
  kdsFetchOrders,
  kdsRecallLastOrder,
} from '../lib/kds-api.js';
import type { KdsSession } from '../lib/kds-session.js';

function sortOrders(orders: NormalisedOrder[]): NormalisedOrder[] {
  return [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
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
  setStatus: (orderId: string, status: KdsAdvanceStatusRequest['status']) => void;
} {
  const { session, onSessionExpired } = params;
  const [orders, setOrders] = useState<NormalisedOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(() => new Set());
  const [recalling, setRecalling] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const onExpiredRef = useRef(onSessionExpired);
  onExpiredRef.current = onSessionExpired;
  const dismissingRef = useRef(dismissingIds);
  dismissingRef.current = dismissingIds;

  const applyEvent = useCallback((ev: KdsServerToClientEvent) => {
    setOrders((prev) => {
      switch (ev.type) {
        case 'kds:order:new':
          return sortOrders([...prev.filter((o) => o.id !== ev.order.id), ev.order]);
        case 'kds:order:removed':
          return prev.filter((o) => o.id !== ev.orderId);
        case 'kds:order:updated':
          // Don't resurrect a card mid-dismiss animation.
          if (dismissingRef.current.has(ev.order.id)) return prev;
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
  }, []);

  const refreshOrders = useCallback(async (token: string) => {
    const data = await kdsFetchOrders(token);
    setOrders((prev) => {
      // Keep locally-dismissing cards so the collapse animation can finish.
      const dismissing = dismissingRef.current;
      if (dismissing.size === 0) return sortOrders(data.orders);
      const byId = new Map(data.orders.map((o) => [o.id, o]));
      const merged = prev
        .filter((o) => dismissing.has(o.id) || byId.has(o.id))
        .map((o) => (dismissing.has(o.id) ? o : byId.get(o.id)!));
      for (const o of data.orders) {
        if (!merged.some((m) => m.id === o.id)) merged.push(o);
      }
      return sortOrders(merged);
    });
  }, []);

  useEffect(() => {
    if (!session) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
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
  }, [session, applyEvent, refreshOrders]);

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

  const setStatus = useCallback(
    (orderId: string, status: KdsAdvanceStatusRequest['status']): void => {
      if (!session) return;
      setError(null);

      void kdsAdvanceOrderStatus(session.token, orderId, status)
        .then(({ order }) => {
          setOrders((prev) => sortOrders([...prev.filter((o) => o.id !== order.id), order]));
        })
        .catch((err) => {
          if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
            onExpiredRef.current(session);
            setError('Session expired — please sign in again.');
          } else {
            setError(err instanceof Error ? err.message : 'Status update failed');
          }
        });
    },
    [session],
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
    setStatus,
  };
}
