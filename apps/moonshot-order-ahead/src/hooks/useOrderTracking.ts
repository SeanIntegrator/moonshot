import type {
  CustomerServerToClientEvent,
  IsoDateTime,
  OrderStatus,
} from '@moonshot/types';
import { useEffect, useRef, useState } from 'react';
import { getStoredToken } from '../lib/api.js';
import {
  useCustomerEvents,
  type CustomerConnectionStatus,
} from '../providers/CustomerEventsProvider.js';

export type OrderTrackingStatus =
  | 'idle'
  | 'connecting'
  | 'tracking'
  | 'completed'
  | 'error';

function mapConnectionStatus(
  status: CustomerConnectionStatus,
  completed: boolean,
): OrderTrackingStatus {
  if (completed) return 'completed';
  if (status === 'connected') return 'tracking';
  if (status === 'error') return 'error';
  if (status === 'connecting') return 'connecting';
  return 'idle';
}

export function useOrderTracking(
  orderId: string | null,
  /** Kept for call-site compatibility; order status is refreshed via onSyncNeeded. */
  _initialOrderStatus?: OrderStatus,
  /** Present for guest checkout only — JWT for `/customer` subscribe */
  orderTrackingToken?: string | null,
  options?: {
    /** Fired when the kitchen marks the order complete (socket or initial status). */
    onOrderCompleted?: (params: { orderId: string; completedAt: IsoDateTime | null }) => void;
    /**
     * HTTP catch-up: called after subscribe ack (missed-event race) and when the
     * socket reports completion so local order state matches the server.
     */
    onSyncNeeded?: () => void;
  },
): {
  trackingStatus: OrderTrackingStatus;
  completedAt: IsoDateTime | null;
  lastPickupTime: IsoDateTime | null;
} {
  const { connectionStatus, subscribe, registerOrderRoom } = useCustomerEvents();
  const [completedAt, setCompletedAt] = useState<IsoDateTime | null>(null);
  const [lastPickupTime, setLastPickupTime] = useState<IsoDateTime | null>(null);
  const [subscribeError, setSubscribeError] = useState(false);
  const onOrderCompletedRef = useRef(options?.onOrderCompleted);
  onOrderCompletedRef.current = options?.onOrderCompleted;
  const onSyncNeededRef = useRef(options?.onSyncNeeded);
  onSyncNeededRef.current = options?.onSyncNeeded;

  const trackingStatus: OrderTrackingStatus = subscribeError
    ? 'error'
    : mapConnectionStatus(connectionStatus, completedAt != null);

  useEffect(() => {
    setCompletedAt(null);
    setLastPickupTime(null);
    setSubscribeError(false);

    if (!orderId?.trim()) return;

    const sessionJwt = getStoredToken();
    const guestJwt = orderTrackingToken?.trim() ?? '';
    const authToken = guestJwt || sessionJwt?.trim() || '';
    if (!authToken) {
      setSubscribeError(true);
      return;
    }

    const releaseRoom = registerOrderRoom({
      orderId: orderId.trim(),
      authToken,
      onSubscribeAck: (err) => {
        if (err) {
          setSubscribeError(true);
          return;
        }
        // Catch-up if the kitchen completed before we joined the room.
        onSyncNeededRef.current?.();
      },
    });

    const unsubscribe = subscribe((ev: CustomerServerToClientEvent) => {
      if (ev.type === 'customerOrderCompleted' && ev.orderId === orderId) {
        setCompletedAt(ev.completedAt);
        onOrderCompletedRef.current?.({ orderId: ev.orderId, completedAt: ev.completedAt });
        // Reload so order.status / payment fields match the socket completion.
        onSyncNeededRef.current?.();
      }
      if (ev.type === 'customerOrderStatusUpdated' && ev.orderId === orderId) {
        onSyncNeededRef.current?.();
      }
      if (ev.type === 'customerEtaUpdated') {
        const u = ev.updates.find((x) => x.orderId === orderId);
        if (u) setLastPickupTime(u.pickupTime);
      }
    });

    return () => {
      unsubscribe();
      releaseRoom();
    };
  }, [orderId, orderTrackingToken, registerOrderRoom, subscribe]);

  return { trackingStatus, completedAt, lastPickupTime };
}
