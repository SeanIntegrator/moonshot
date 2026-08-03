import type { CustomerClientToServerEvent } from '@moonshot/types';
import type { Server } from 'socket.io';
import { authorizeCustomerSubscribe } from '../lib/customer-track-auth.js';
import { customerCafeRoom, customerOrderRoom } from './customer-events.js';
import { pool } from '../db.js';

function isSubscribePayload(
  p: unknown,
): p is Pick<Extract<CustomerClientToServerEvent, { type: 'customer:subscribe' }>, 'orderId' | 'authToken'> {
  if (typeof p !== 'object' || p === null) return false;
  const o = p as Record<string, unknown>;
  return typeof o.orderId === 'string' && typeof o.authToken === 'string';
}

function isSubscribeCafePayload(p: unknown): p is { cafeSlug: string } {
  if (typeof p !== 'object' || p === null) return false;
  const o = p as Record<string, unknown>;
  return typeof o.cafeSlug === 'string' && o.cafeSlug.trim().length > 0;
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
          // Await join before ack — otherwise the client may think it is
          // subscribed while still outside the room and miss the next push.
          await socket.join(customerOrderRoom(trimmedOrderId));
          ack?.();
        })();
      },
    );

    // Public menu invalidation — no auth (GET /menu is already public).
    socket.on(
      'customer:subscribeCafe',
      (payload: unknown, ack?: (err?: string) => void) => {
        void (async () => {
          if (!isSubscribeCafePayload(payload)) {
            ack?.('Invalid subscribeCafe payload');
            return;
          }
          const slug = payload.cafeSlug.trim().toLowerCase();
          const { rows } = await pool.query<{ id: string }>(
            `SELECT id FROM cafes WHERE slug = $1 LIMIT 1`,
            [slug],
          );
          if (!rows[0]) {
            ack?.('Unknown cafe');
            return;
          }
          await socket.join(customerCafeRoom(rows[0].id));
          ack?.();
        })();
      },
    );
  });
}
