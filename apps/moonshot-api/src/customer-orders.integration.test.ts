import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { API_VERSION_PREFIX } from '@moonshot/types';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createMoonshotHttpServer } from './create-moonshot-http-server.js';
import { pool } from './db.js';
import { signTrackOrderJwt } from './lib/customer-socket-token.js';

const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

describe.skipIf(!connectionString)('customer orders HTTP (integration)', () => {
  let cafeId: string;
  let slug: string;
  const jwtSecret = process.env.JWT_SECRET ?? 'moonshot-customer-orders-integration-secret';
  let prevJwtSecret: string | undefined;

  beforeAll(() => {
    prevJwtSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = jwtSecret;
  });

  afterAll(() => {
    if (prevJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = prevJwtSecret;
  });

  beforeEach(async () => {
    slug = `cust-${randomUUID().slice(0, 8)}`;
    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO cafes (name, slug, pos_provider)
       VALUES ($1, $2, 'manual')
       RETURNING id`,
      [`Customer orders ${slug}`, slug],
    );
    cafeId = inserted.rows[0]!.id;
  });

  afterEach(async () => {
    await pool.query('DELETE FROM cafes WHERE id = $1', [cafeId]);
    await pool.query('DELETE FROM users WHERE email = $1', [`u-${slug}@example.com`]);
  });

  it('guest can GET and cancel with trackingToken query', async () => {
    const orderId = randomUUID();
    await pool.query(
      `INSERT INTO orders (
        id, cafe_id, user_id, customer_name, total_minor, currency, order_type, source,
        status, payment_status
      ) VALUES ($1, $2, NULL, 'Guest Patron', 300, 'GBP', 'takeaway', 'app', 'confirmed', 'unpaid')`,
      [orderId, cafeId],
    );
    await pool.query(
      `INSERT INTO order_items (
        order_id, menu_item_id, item_name, quantity, unit_price_minor, modifiers, allergens
      ) VALUES ($1, NULL, 'Latte', 1, 300, '[]', '{}')`,
      [orderId],
    );

    const tok = signTrackOrderJwt({ orderId, cafeId, secret: jwtSecret });
    const { app } = createMoonshotHttpServer();

    const getRes = await request(app)
      .get(`${API_VERSION_PREFIX}/orders/${orderId}`)
      .query({ trackingToken: tok })
      .set('X-Cafe-Slug', slug);

    expect(getRes.status).toBe(200);
    expect(getRes.body.ok).toBe(true);
    expect(getRes.body.data.order.id).toBe(orderId);

    const cancelRes = await request(app)
      .post(`${API_VERSION_PREFIX}/orders/${orderId}/cancel`)
      .query({ trackingToken: tok })
      .set('X-Cafe-Slug', slug);

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.order.status).toBe('cancelled');

    const cancelAgain = await request(app)
      .post(`${API_VERSION_PREFIX}/orders/${orderId}/cancel`)
      .query({ trackingToken: tok })
      .set('X-Cafe-Slug', slug);

    expect(cancelAgain.status).toBe(200);
    expect(cancelAgain.body.data.order.status).toBe('cancelled');
  });

  it('signed-in customer can list active orders', async () => {
    const userId = randomUUID();
    await pool.query(`INSERT INTO users (id, email) VALUES ($1, $2)`, [userId, `u-${slug}@example.com`]);
    await pool.query(`INSERT INTO cafe_users (cafe_id, user_id) VALUES ($1, $2)`, [cafeId, userId]);

    const orderId = randomUUID();
    await pool.query(
      `INSERT INTO orders (
        id, cafe_id, user_id, customer_name, total_minor, currency, order_type, source,
        status, payment_status
      ) VALUES ($1, $2, $3, 'Member', 400, 'GBP', 'takeaway', 'app', 'confirmed', 'unpaid')`,
      [orderId, cafeId, userId],
    );
    await pool.query(
      `INSERT INTO order_items (
        order_id, menu_item_id, item_name, quantity, unit_price_minor, modifiers, allergens
      ) VALUES ($1, NULL, 'Flat white', 1, 400, '[]', '{}')`,
      [orderId],
    );

    const sessionJwt = jwt.sign(
      { sub: userId, userId, email: `u-${slug}@example.com` },
      jwtSecret,
      { expiresIn: '1h' },
    );

    const { app } = createMoonshotHttpServer();
    const res = await request(app)
      .get(`${API_VERSION_PREFIX}/orders/me`)
      .set('Authorization', `Bearer ${sessionJwt}`)
      .set('X-Cafe-Slug', slug);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.active.some((o: { id: string }) => o.id === orderId)).toBe(true);
  });

  it('GET pickup-estimate returns envelope', async () => {
    const { app } = createMoonshotHttpServer();
    const res = await request(app).get(`${API_VERSION_PREFIX}/orders/pickup-estimate`).set('X-Cafe-Slug', slug);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.data.pickupTime).toBe('string');
    expect(typeof res.body.data.minutesFromNow).toBe('number');
  });
});
