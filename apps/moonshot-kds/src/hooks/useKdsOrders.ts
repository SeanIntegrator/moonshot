import {
  KDS_SOCKET_NAMESPACE,
  type KdsServerToClientEvent,
  type NormalisedOrder,
} from '@moonshot/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type Socket, io } from 'socket.io-client';
import { getApiBaseUrl, kdsCompleteOrder, kdsFetchOrders } from '../lib/kds-api.js';
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
  busyId: string | null;
  complete: (orderId: string) => Promise<void>;
} {
  const { session, onSessionExpired } = params;
  const [orders, setOrders] = useState<NormalisedOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const onExpiredRef = useRef(onSessionExpired);
  onExpiredRef.current = onSessionExpired;

  const applyEvent = useCallback((ev: KdsServerToClientEvent) => {
    setOrders((prev) => {
      switch (ev.type) {
        case 'kds:order:new':
          return sortOrders([...prev.filter((o) => o.id !== ev.order.id), ev.order]);
        case 'kds:order:removed':
          return prev.filter((o) => o.id !== ev.orderId);
        case 'kds:order:updated':
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
  }, []);

  const refreshOrders = useCallback(async (token: string) => {
    const data = await kdsFetchOrders(token);
    setOrders(sortOrders(data.orders));
  }, []);

  useEffect(() => {
    if (!session) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setOrders([]);
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

  const complete = useCallback(
    async (orderId: string): Promise<void> => {
      if (!session) return;
      setBusyId(orderId);
      setError(null);
      try {
        await kdsCompleteOrder(session.token, orderId);
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } catch (err) {
        if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
          onExpiredRef.current(session);
          setError('Session expired — please sign in again.');
        } else {
          setError(err instanceof Error ? err.message : 'Complete failed');
        }
      } finally {
        setBusyId(null);
      }
    },
    [session],
  );

  return { orders, error, setError, busyId, complete };
}
