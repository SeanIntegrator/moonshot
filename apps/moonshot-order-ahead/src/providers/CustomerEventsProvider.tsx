import type { CustomerServerToClientEvent } from '@moonshot/types';
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
import { createCustomerSocket } from '../lib/socket.js';

export type CustomerConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

export type OrderRoomRegistration = {
  orderId: string;
  /** Guest tracking JWT or signed-in session JWT — per-order, not per-connection. */
  authToken: string;
  /** Fired when the server acks (or rejects) this order's subscribe. */
  onSubscribeAck?: (err?: string) => void;
};

type EventHandler = (ev: CustomerServerToClientEvent) => void;

type RoomEntry = {
  count: number;
  authToken: string;
  /** Callers waiting for the in-flight subscribe ack. */
  pendingAcks: Set<(err?: string) => void>;
  /** True once the server has acked a successful join for this connection cycle. */
  joined: boolean;
};

type CustomerEventsContextValue = {
  connectionStatus: CustomerConnectionStatus;
  subscribe: (handler: EventHandler) => () => void;
  registerOrderRoom: (params: OrderRoomRegistration) => () => void;
};

const CustomerEventsContext = createContext<CustomerEventsContextValue | null>(null);

/**
 * Single `/customer` Socket.io connection shared by ActiveOrdersProvider,
 * useOrderTracking, and LoyaltyProvider.
 *
 * Room membership is refcounted: two consumers for the same orderId share one
 * `customer:subscribe`, and only the last release emits `customer:unsubscribe`.
 * MenuProvider still owns its own café-scoped connection (different shape).
 *
 * StrictMode remounts are tolerated via a short disconnect deferral so refcounts
 * do not tear the socket down between the simulated unmount and remount.
 */
export function CustomerEventsProvider({ children }: { children: ReactNode }) {
  const [connectionStatus, setConnectionStatus] = useState<CustomerConnectionStatus>('idle');

  const handlersRef = useRef(new Set<EventHandler>());
  const roomsRef = useRef(new Map<string, RoomEntry>());
  const socketRef = useRef<ReturnType<typeof createCustomerSocket> | null>(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumps when interest changes so the connection effect re-evaluates.
  const [interestEpoch, setInterestEpoch] = useState(0);

  const bumpInterest = useCallback(() => {
    setInterestEpoch((n) => n + 1);
  }, []);

  const hasInterest = useCallback(() => {
    return handlersRef.current.size > 0 || roomsRef.current.size > 0;
  }, []);

  const subscribeAllRooms = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected) return;

    for (const [orderId, entry] of roomsRef.current) {
      entry.joined = false;
      socket.emit(
        'customer:subscribe',
        { type: 'customer:subscribe', orderId, authToken: entry.authToken },
        (err?: string) => {
          const current = roomsRef.current.get(orderId);
          if (!current) return;
          if (!err) current.joined = true;
          for (const ack of current.pendingAcks) ack(err);
          current.pendingAcks.clear();
        },
      );
    }
  }, []);

  // Own the socket while any handler or room registration is active.
  useEffect(() => {
    if (!hasInterest()) {
      // Defer disconnect so StrictMode's unmount→remount does not thrash.
      if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = setTimeout(() => {
        if (hasInterest()) return;
        const socket = socketRef.current;
        if (socket) {
          socket.removeAllListeners();
          socket.disconnect();
          socketRef.current = null;
        }
        setConnectionStatus('idle');
        for (const entry of roomsRef.current.values()) {
          entry.joined = false;
        }
      }, 50);
      return;
    }

    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }

    if (socketRef.current) return;

    setConnectionStatus('connecting');
    const socket = createCustomerSocket();
    socketRef.current = socket;

    const onEvent = (ev: CustomerServerToClientEvent) => {
      for (const handler of handlersRef.current) handler(ev);
    };

    socket.on('customer:event', onEvent);

    socket.on('connect', () => {
      setConnectionStatus('connected');
      subscribeAllRooms();
    });

    socket.on('disconnect', () => {
      for (const entry of roomsRef.current.values()) {
        entry.joined = false;
      }
      if (socketRef.current === socket) {
        setConnectionStatus(hasInterest() ? 'connecting' : 'idle');
      }
    });

    socket.on('connect_error', () => {
      setConnectionStatus('error');
    });

    socket.connect();

    return () => {
      // Effect cleanup only runs when the provider unmounts or deps flip in a
      // way that tears us down; the deferred path above handles interest→0.
    };
  }, [interestEpoch, hasInterest, subscribeAllRooms]);

  // Tear down on provider unmount.
  useEffect(() => {
    return () => {
      if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
      const socket = socketRef.current;
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const subscribe = useCallback(
    (handler: EventHandler) => {
      handlersRef.current.add(handler);
      bumpInterest();
      return () => {
        handlersRef.current.delete(handler);
        bumpInterest();
      };
    },
    [bumpInterest],
  );

  const registerOrderRoom = useCallback(
    (params: OrderRoomRegistration) => {
      const orderId = params.orderId.trim();
      const authToken = params.authToken.trim();
      if (!orderId || !authToken) {
        params.onSubscribeAck?.('Missing orderId or authToken');
        return () => undefined;
      }

      let entry = roomsRef.current.get(orderId);
      if (!entry) {
        entry = {
          count: 0,
          authToken,
          pendingAcks: new Set(),
          joined: false,
        };
        roomsRef.current.set(orderId, entry);
      } else {
        // Prefer a fresher token if a second consumer registers (e.g. session after guest).
        entry.authToken = authToken;
      }

      entry.count += 1;
      if (params.onSubscribeAck) {
        if (entry.joined && socketRef.current?.connected) {
          // Already in the room on this connection — ack immediately.
          params.onSubscribeAck();
        } else {
          entry.pendingAcks.add(params.onSubscribeAck);
        }
      }

      const socket = socketRef.current;
      if (entry.count === 1 && socket?.connected) {
        socket.emit(
          'customer:subscribe',
          { type: 'customer:subscribe', orderId, authToken: entry.authToken },
          (err?: string) => {
            const current = roomsRef.current.get(orderId);
            if (!current) return;
            if (!err) current.joined = true;
            for (const ack of current.pendingAcks) ack(err);
            current.pendingAcks.clear();
          },
        );
      }

      bumpInterest();

      let released = false;
      return () => {
        if (released) return;
        released = true;
        const current = roomsRef.current.get(orderId);
        if (!current) {
          bumpInterest();
          return;
        }
        if (params.onSubscribeAck) current.pendingAcks.delete(params.onSubscribeAck);
        current.count -= 1;
        if (current.count <= 0) {
          roomsRef.current.delete(orderId);
          const live = socketRef.current;
          if (live?.connected) {
            live.emit('customer:unsubscribe', { type: 'customer:unsubscribe', orderId });
          }
        }
        bumpInterest();
      };
    },
    [bumpInterest],
  );

  const value = useMemo(
    () => ({
      connectionStatus,
      subscribe,
      registerOrderRoom,
    }),
    [connectionStatus, subscribe, registerOrderRoom],
  );

  return (
    <CustomerEventsContext.Provider value={value}>{children}</CustomerEventsContext.Provider>
  );
}

export function useCustomerEvents(): CustomerEventsContextValue {
  const ctx = useContext(CustomerEventsContext);
  if (!ctx) {
    throw new Error('useCustomerEvents requires CustomerEventsProvider');
  }
  return ctx;
}
