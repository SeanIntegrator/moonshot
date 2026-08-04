import type {
  CustomerServerToClientEvent,
  IsoDateTime,
  OrderStatus,
} from '@moonshot/types';
import { useEffect, useRef, useState } from 'react';
import { getStoredToken } from '../lib/api.js';
import { createCustomerSocket } from '../lib/socket.js';

export type OrderTrackingStatus =
  | 'idle'
  | 'connecting'
  | 'tracking'
  | 'completed'
  | 'error';

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
  const [trackingStatus, setTrackingStatus] = useState<OrderTrackingStatus>('idle');
  const [completedAt, setCompletedAt] = useState<IsoDateTime | null>(null);
  const [lastPickupTime, setLastPickupTime] = useState<IsoDateTime | null>(null);
  const onOrderCompletedRef = useRef(options?.onOrderCompleted);
  onOrderCompletedRef.current = options?.onOrderCompleted;
  const onSyncNeededRef = useRef(options?.onSyncNeeded);
  onSyncNeededRef.current = options?.onSyncNeeded;

  useEffect(() => {
    setCompletedAt(null);
    setLastPickupTime(null);

    if (!orderId?.trim()) {
      setTrackingStatus('idle');
      return;
    }

    const sessionJwt = getStoredToken();
    const guestJwt = orderTrackingToken?.trim() ?? '';
    if (!guestJwt && !sessionJwt?.trim()) {
      setTrackingStatus('error');
      return;
    }

    setTrackingStatus('connecting');
    const socket = createCustomerSocket();

    function onCustomerEvent(ev: CustomerServerToClientEvent): void {
      if (ev.type === 'customerOrderCompleted' && ev.orderId === orderId) {
        setCompletedAt(ev.completedAt);
        setTrackingStatus('completed');
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
    }

    socket.on('customer:event', onCustomerEvent);

    socket.on('connect', () => {
      setTrackingStatus('tracking');
      const authToken =
        guestJwt.trim() || getStoredToken()?.trim() || '';
      if (!authToken) {
        setTrackingStatus('error');
        return;
      }
      socket.emit(
        'customer:subscribe',
        {
          type: 'customer:subscribe',
          orderId,
          authToken,
        },
        (err?: string) => {
          if (err) {
            setTrackingStatus('error');
            return;
          }
          // Catch-up if the kitchen completed before we joined the room.
          onSyncNeededRef.current?.();
        },
      );
    });

    socket.on('connect_error', () => {
      setTrackingStatus('error');
    });

    socket.connect();

    return () => {
      socket.off('customer:event', onCustomerEvent);
      socket.disconnect();
    };
  }, [orderId, orderTrackingToken]);

  return { trackingStatus, completedAt, lastPickupTime };
}
