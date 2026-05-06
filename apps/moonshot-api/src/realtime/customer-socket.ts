import type { CustomerClientToServerEvent } from '@moonshot/types';
import type { Server } from 'socket.io';
import { customerOrderRoom } from './customer-events.js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isSubscribePayload(p: unknown): p is Pick<CustomerClientToServerEvent, 'orderId' | 'token'> {
  if (typeof p !== 'object' || p === null) return false;
  const o = p as Record<string, unknown>;
  return typeof o.orderId === 'string' && (o.token === undefined || typeof o.token === 'string');
}

export function registerCustomerSocketHandlers(io: Server): void {
  const ns = io.of('/customer');

  ns.on('connection', (socket) => {
    socket.on(
      'customer:subscribe',
      (payload: unknown, ack?: (err?: string) => void) => {
        if (!isSubscribePayload(payload)) {
          ack?.('Invalid subscribe payload');
          return;
        }
        const trimmed = payload.orderId.trim();
        if (!UUID_RE.test(trimmed)) {
          ack?.('Invalid orderId');
          return;
        }

        /* Future: validate payload.token against customer JWT and ensure user may track this order. */

        void socket.join(customerOrderRoom(trimmed));
        ack?.();
      },
    );
  });
}
