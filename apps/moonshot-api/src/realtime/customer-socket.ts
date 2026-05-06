import type { CustomerClientToServerEvent } from '@moonshot/types';
import type { Server } from 'socket.io';
import { authorizeCustomerSubscribe } from '../lib/customer-track-auth.js';
import { customerOrderRoom } from './customer-events.js';
import { pool } from '../db.js';

function isSubscribePayload(p: unknown): p is Pick<CustomerClientToServerEvent, 'orderId' | 'authToken'> {
  if (typeof p !== 'object' || p === null) return false;
  const o = p as Record<string, unknown>;
  return typeof o.orderId === 'string' && typeof o.authToken === 'string';
}

export function registerCustomerSocketHandlers(io: Server): void {
  const ns = io.of('/customer');

  ns.on('connection', (socket) => {
    socket.on(
      'customer:subscribe',
      (payload: unknown, ack?: (err?: string) => void) => {
        void (async () => {
          if (!isSubscribePayload(payload)) {
            ack?.('Invalid subscribe payload');
            return;
          }
          const jwtSecret = process.env.JWT_SECRET;
          if (!jwtSecret) {
            ack?.('Server configuration missing');
            return;
          }

          const result = await authorizeCustomerSubscribe({
            pool,
            jwtSecret,
            subscribeOrderId: payload.orderId,
            authToken: payload.authToken,
          });

          if (!result.ok) {
            ack?.(result.message);
            return;
          }

          const trimmedOrderId = payload.orderId.trim();
          void socket.join(customerOrderRoom(trimmedOrderId));
          ack?.();
        })();
      },
    );
  });
}
