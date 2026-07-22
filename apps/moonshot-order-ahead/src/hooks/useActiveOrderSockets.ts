import type { CustomerServerToClientEvent } from '@moonshot/types';
import { useEffect, useRef } from 'react';
import { getStoredToken } from '../lib/api.js';
import { createCustomerSocket } from '../lib/socket.js';

export type ActiveOrderSocketChange =
  | { kind: 'completed'; orderId: string }
  | { kind: 'updated'; orderId: string };

/**
 * Observes `/customer` rooms for the given active order IDs.
 * Push path for Home / Profile lists — HTTP poll remains the reliability fallback.
 */
export function useActiveOrderSockets(
  orderIds: readonly string[],
  enabled: boolean,
  onOrdersChanged: (change: ActiveOrderSocketChange) => void,
): void {
  const onChangedRef = useRef(onOrdersChanged);
  onChangedRef.current = onOrdersChanged;

  // Stable key so reconnects only happen when the set of IDs changes.
  const idsKey = orderIds.slice().sort().join(',');

  useEffect(() => {
    if (!enabled || !idsKey) return;

    const ids = idsKey.split(',');
    const authToken = getStoredToken()?.trim() ?? '';
    if (!authToken) return;

    const socket = createCustomerSocket();

    function onCustomerEvent(ev: CustomerServerToClientEvent): void {
      if (ev.type === 'customerOrderCompleted' && ids.includes(ev.orderId)) {
        onChangedRef.current({ kind: 'completed', orderId: ev.orderId });
        return;
      }
      if (ev.type === 'customerOrderStatusUpdated' && ids.includes(ev.orderId)) {
        onChangedRef.current({ kind: 'updated', orderId: ev.orderId });
        return;
      }
      if (ev.type === 'customerEtaUpdated') {
        const hit = ev.updates.find((u) => ids.includes(u.orderId));
        if (hit) onChangedRef.current({ kind: 'updated', orderId: hit.orderId });
      }
    }

    socket.on('customer:event', onCustomerEvent);

    socket.on('connect', () => {
      const token = getStoredToken()?.trim() || authToken;
      if (!token) return;
      for (const orderId of ids) {
        socket.emit('customer:subscribe', {
          type: 'customer:subscribe',
          orderId,
          authToken: token,
        });
      }
    });

    socket.connect();

    return () => {
      socket.off('customer:event', onCustomerEvent);
      socket.disconnect();
    };
  }, [enabled, idsKey]);
}
