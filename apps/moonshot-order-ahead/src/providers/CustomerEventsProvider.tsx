import type { CustomerServerToClientEvent } from '@moonshot/types';
import { CUSTOMER_SOCKET_NAMESPACE } from '@moonshot/domain';
import { RealtimeConnection, type RealtimeStatus } from '@moonshot/web-runtime';
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
import { getApiBaseUrl } from '../lib/api.js';

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

function toCustomerStatus(status: RealtimeStatus): CustomerConnectionStatus {
  switch (status) {
    case 'connected':
      return 'connected';
    case 'idle':
      return 'idle';
    case 'unauthorized':
    case 'failed':
      return 'error';
    case 'connecting':
    case 'reconnecting':
      return 'connecting';
  }
}

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
  const connectionRef = useRef<RealtimeConnection | null>(null);
  const disconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [interestEpoch, setInterestEpoch] = useState(0);

  const bumpInterest = useCallback(() => {
    setInterestEpoch((n) => n + 1);
  }, []);

  const hasInterest = useCallback(() => {
    return handlersRef.current.size > 0 || roomsRef.current.size > 0;
  }, []);

  const emitSubscribe = useCallback((orderId: string, entry: RoomEntry): void => {
    const connection = connectionRef.current;
    if (!connection?.connected) return;
    connection.emit(
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
  }, []);

  const subscribeAllRooms = useCallback(() => {
    const connection = connectionRef.current;
    if (!connection?.connected) return;

    for (const [orderId, entry] of roomsRef.current) {
      entry.joined = false;
      emitSubscribe(orderId, entry);
    }
  }, [emitSubscribe]);

  const markRoomsRecovered = useCallback(() => {
    for (const entry of roomsRef.current.values()) {
      entry.joined = true;
      for (const ack of entry.pendingAcks) ack();
      entry.pendingAcks.clear();
    }
  }, []);

  useEffect(() => {
    if (!hasInterest()) {
      if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = setTimeout(() => {
        if (hasInterest()) return;
        const connection = connectionRef.current;
        if (connection) {
          connection.destroy();
          connectionRef.current = null;
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

    if (connectionRef.current) return;

    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      setConnectionStatus('error');
      return;
    }

    setConnectionStatus('connecting');
    const connection = new RealtimeConnection({
      baseUrl,
      namespace: CUSTOMER_SOCKET_NAMESPACE,
      onStatusChange: (status) => setConnectionStatus(toCustomerStatus(status)),
      onConnect: ({ recovered }) => {
        if (recovered) {
          markRoomsRecovered();
          return;
        }
        subscribeAllRooms();
      },
    });
    connectionRef.current = connection;

    connection.on('customer:event', (...args: unknown[]) => {
      const ev = args[0] as CustomerServerToClientEvent;
      for (const handler of handlersRef.current) handler(ev);
    });
    connection.connect();

    return () => {
      // Interest→0 teardown is deferred above; this cleanup is for provider unmount / dep flip.
    };
  }, [interestEpoch, hasInterest, subscribeAllRooms, markRoomsRecovered]);

  useEffect(() => {
    return () => {
      if (disconnectTimerRef.current) clearTimeout(disconnectTimerRef.current);
      const connection = connectionRef.current;
      if (connection) {
        connection.destroy();
        connectionRef.current = null;
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
        entry.authToken = authToken;
      }

      entry.count += 1;
      if (params.onSubscribeAck) {
        if (entry.joined && connectionRef.current?.connected) {
          params.onSubscribeAck();
        } else {
          entry.pendingAcks.add(params.onSubscribeAck);
        }
      }

      if (entry.count === 1) {
        emitSubscribe(orderId, entry);
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
          const live = connectionRef.current;
          if (live?.connected) {
            live.emit('customer:unsubscribe', { type: 'customer:unsubscribe', orderId });
          }
        }
        bumpInterest();
      };
    },
    [bumpInterest, emitSubscribe],
  );

  const value = useMemo(
    () => ({
      connectionStatus,
      subscribe,
      registerOrderRoom,
    }),
    [connectionStatus, subscribe, registerOrderRoom],
  );

  return <CustomerEventsContext.Provider value={value}>{children}</CustomerEventsContext.Provider>;
}

export function useCustomerEvents(): CustomerEventsContextValue {
  const ctx = useContext(CustomerEventsContext);
  if (!ctx) {
    throw new Error('useCustomerEvents requires CustomerEventsProvider');
  }
  return ctx;
}
