import { randomUUID } from 'node:crypto';
import { API_VERSION_PREFIX } from '@moonshot/types';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createMoonshotHttpServer } from './create-moonshot-http-server.js';
import { pool } from './db.js';
import { findOrderByStripeCheckoutSessionForCafe } from './lib/orders/order-checkout.js';

const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

describe.skipIf(!connectionString)(
  'checkout session recovery by payment_sessions (integration)',
  () => {
    let cafeId: string;
    let slug: string;

    beforeEach(async () => {
      slug = `test-rec-${randomUUID().slice(0, 8)}`;
      const inserted = await pool.query<{ id: string }>(
        `INSERT INTO cafes (name, slug, pos_provider)
         VALUES ($1, $2, 'manual')
         RETURNING id`,
        [`Recovery test ${slug}`, slug],
      );
      cafeId = inserted.rows[0]!.id;
    });

    afterEach(async () => {
      await pool.query('DELETE FROM cafes WHERE id = $1', [cafeId]);
    });

    it('HTTP rejects malformed session id before recovery lookup', async () => {
      const { app } = createMoonshotHttpServer();
      const res = await request(app)
        .get(`${API_VERSION_PREFIX}/orders/checkout-session/not-cs-prefixed`)
        .set('X-Cafe-Slug', slug);

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
    });

    it('findOrderByStripeCheckoutSessionForCafe joins payment_sessions to orders', async () => {
      const orderId = randomUUID();
      const sessionId = `cs_test_${randomUUID().replace(/-/g, '').slice(0, 24)}`;

      await pool.query(
        `INSERT INTO orders (
          id, cafe_id, customer_name, total_minor, currency, order_type, source,
          status, payment_status
        ) VALUES ($1, $2, 'Recovery Patron', 250, 'GBP', 'takeaway', 'app', 'pending', 'unpaid')`,
        [orderId, cafeId],
      );

      await pool.query(
        `INSERT INTO order_items (
          order_id, menu_item_id, item_name, quantity, unit_price_minor, modifiers, allergens
        ) VALUES ($1, NULL, 'Test Item', 1, 250, '[]', '{}')`,
        [orderId],
      );

      await pool.query(
        `INSERT INTO payment_sessions (
          order_id, cafe_id, provider, session_id, payment_intent_id, amount_minor, currency, type
        ) VALUES ($1, $2, 'stripe', $3, NULL, 250, 'GBP', 'initial')`,
        [orderId, cafeId, sessionId],
      );

      await pool.query(`UPDATE orders SET stripe_checkout_session_id = $1 WHERE id = $2`, [
        sessionId,
        orderId,
      ]);

      const order = await findOrderByStripeCheckoutSessionForCafe(sessionId, cafeId);
      expect(order).not.toBeNull();
      expect(order!.id).toBe(orderId);
      expect(order!.customerName).toBe('Recovery Patron');
      expect(order!.items).toHaveLength(1);
      expect(order!.items[0]!.itemName).toBe('Test Item');

      const { app } = createMoonshotHttpServer();
      const res = await request(app)
        .get(`${API_VERSION_PREFIX}/orders/checkout-session/${sessionId}`)
        .set('X-Cafe-Slug', slug);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.order.id).toBe(orderId);
    });

    it('HTTP recovery returns 404 for another café slug scoped to same DB row', async () => {
      const orderId = randomUUID();
      const sessionId = `cs_test_${randomUUID().replace(/-/g, '').slice(0, 24)}`;

      await pool.query(
        `INSERT INTO orders (
          id, cafe_id, customer_name, total_minor, order_type, source, status, payment_status
        ) VALUES ($1, $2, 'X', 100, 'takeaway', 'app', 'pending', 'unpaid')`,
        [orderId, cafeId],
      );

      await pool.query(
        `INSERT INTO payment_sessions (
          order_id, cafe_id, provider, session_id, payment_intent_id, amount_minor, currency
        ) VALUES ($1, $2, 'stripe', $3, NULL, 100, 'GBP')`,
        [orderId, cafeId, sessionId],
      );

      const otherSlug = `test-rec-other-${randomUUID().slice(0, 8)}`;
      const other = await pool.query<{ id: string }>(
        `INSERT INTO cafes (name, slug, pos_provider)
         VALUES ($1, $2, 'manual')
         RETURNING id`,
        [`Other ${otherSlug}`, otherSlug],
      );
      const otherCafeId = other.rows[0]!.id;

      try {
        const { app } = createMoonshotHttpServer();
        const res = await request(app)
          .get(`${API_VERSION_PREFIX}/orders/checkout-session/${sessionId}`)
          .set('X-Cafe-Slug', otherSlug);

        expect(res.status).toBe(404);
        expect(res.body.ok).toBe(false);
      } finally {
        await pool.query('DELETE FROM cafes WHERE id = $1', [otherCafeId]);
      }
    });
  },
);
