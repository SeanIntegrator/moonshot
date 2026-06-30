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

/** Derives user-visible step index 0–3 from order status until socket confirms completion. */
export function trackingStepFromStatus(
  status: OrderTrackingStatus,
  orderStatus: OrderStatus | undefined,
): number {
  if (status === 'completed') return 3;
  if (!orderStatus) return 0;
  switch (orderStatus) {
    case 'confirmed':
    case 'pending':
      return 0;
    case 'preparing':
      return 1;
    case 'ready':
      return 2;
    case 'completed':
      return 3;
    default:
      return 0;
  }
}

export function useOrderTracking(
  orderId: string | null,
  /** From `POST /orders` response — drives steps until realtime status exists */
  initialOrderStatus?: OrderStatus,
  /** Present for guest checkout only — JWT for `/customer` subscribe */
  orderTrackingToken?: string | null,
  options?: {
    /** Fired when the kitchen marks the order complete (socket or initial status). */
    onOrderCompleted?: (params: { orderId: string; completedAt: IsoDateTime | null }) => void;
  },
): {
  trackingStatus: OrderTrackingStatus;
  completedAt: IsoDateTime | null;
  /** Step 0 Confirmed … 3 Done — for UI progression */
  stepIndex: number;
  lastPickupTime: IsoDateTime | null;
} {
  const [trackingStatus, setTrackingStatus] = useState<OrderTrackingStatus>('idle');
  const [completedAt, setCompletedAt] = useState<IsoDateTime | null>(null);
  const [liveOrderStatus, setLiveOrderStatus] = useState<OrderStatus | undefined>(initialOrderStatus);
  const [lastPickupTime, setLastPickupTime] = useState<IsoDateTime | null>(null);
  const onOrderCompletedRef = useRef(options?.onOrderCompleted);
  onOrderCompletedRef.current = options?.onOrderCompleted;

  useEffect(() => {
    setLiveOrderStatus(initialOrderStatus);
  }, [orderId, initialOrderStatus]);

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
        setLiveOrderStatus('completed');
        onOrderCompletedRef.current?.({ orderId: ev.orderId, completedAt: ev.completedAt });
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
          }
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

  const stepIndex = trackingStepFromStatus(trackingStatus, liveOrderStatus);

  return { trackingStatus, completedAt, stepIndex, lastPickupTime };
}
