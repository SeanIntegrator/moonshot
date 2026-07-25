import { API_VERSION_PREFIX, type NormalisedOrder } from '@moonshot/types';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const advanceOrderStatusForKds = vi.hoisted(() => vi.fn());
const emitKdsServerToClient = vi.hoisted(() => vi.fn());
const emitCustomerServerToClient = vi.hoisted(() => vi.fn());

vi.mock('../lib/orders/order-kds.js', () => ({
  completeOrderForKds: vi.fn(),
  listOpenOrdersForKds: vi.fn(),
  recallLastCompletedOrderForKds: vi.fn(),
  advanceOrderStatusForKds,
  stretchOrderEtaForKds: vi.fn(),
}));

vi.mock('../lib/loyalty-after-kds-complete.js', () => ({
  applyLoyaltyAfterKdsComplete: vi.fn(),
}));

vi.mock('../lib/pickup-eta.js', () => ({
  recomputePickupEtasForCafe: vi.fn(),
}));

vi.mock('../realtime/kds-events.js', () => ({
  emitKdsServerToClient,
  kdsCafeRoom: (cafeId: string) => `kds:cafe:${cafeId}`,
}));

vi.mock('../realtime/customer-events.js', () => ({
  emitCustomerServerToClient,
}));

vi.mock('../db.js', () => ({
  pool: { query: vi.fn() },
}));

vi.mock('../lib/cafe-map.js', () => ({
  mapCafeRow: (row: { kds_config: unknown; id: string }) => ({
    cafeId: row.id,
    kdsConfig: { ...(row.kds_config as object), cafeId: row.id },
  }),
  activeFeatureKeys: () => [],
}));

vi.mock('../lib/kds-users-repository.js', () => ({
  findKdsUserForLogin: vi.fn(),
  touchKdsUserLogin: vi.fn(),
}));

vi.mock('../lib/kds-password.js', () => ({
  verifyKdsPassword: () => false,
}));

const KDS_USER_ID = '00000000-0000-0000-0000-00000000aaaa';
const CAFE_ID = '00000000-0000-0000-0000-00000000bbbb';
const ORDER_ID = '00000000-0000-0000-0000-00000000cccc';

function kdsToken(): string {
  return jwt.sign(
    {
      sub: KDS_USER_ID,
      kdsUserId: KDS_USER_ID,
      cafeId: CAFE_ID,
      cafeSlug: 'test-cafe',
      purpose: 'kds',
    },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' },
  );
}

function mockOrder(status: NormalisedOrder['status']): NormalisedOrder {
  return {
    id: ORDER_ID,
    cafeId: CAFE_ID,
    source: 'app',
    customerName: 'Sam',
    customerId: '00000000-0000-0000-0000-00000000dddd',
    items: [],
    notes: null,
    orderType: 'takeaway',
    status,
    paymentStatus: 'unpaid',
    totalMinor: 350,
    currency: 'GBP',
    pickup: {
      quotedPickupTime: null,
      pickupTime: null,
      completedAt: null,
      etaMode: 'auto',
    },
    createdAt: '2026-05-18T12:00:00.000Z',
    updatedAt: '2026-05-18T12:05:00.000Z',
    posOrderId: null,
    editToken: null,
    parentOrderId: null,
  };
}

async function appWithKdsRouter() {
  const { kdsRouter } = await import('./kds.js');
  const { errorHandler } = await import('../middleware/error-handler.js');
  const app = express();
  app.use(express.json());
  app.use(`${API_VERSION_PREFIX}/kds`, kdsRouter);
  app.use(errorHandler);
  return app;
}

describe('POST /api/v1/kds/orders/:orderId/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'kds-status-test-secret';
  });

  it('advances confirmed → ready (Flow skip-preparing)', async () => {
    const order = mockOrder('ready');
    advanceOrderStatusForKds.mockResolvedValue(order);

    const app = await appWithKdsRouter();
    const res = await request(app)
      .post(`${API_VERSION_PREFIX}/kds/orders/${ORDER_ID}/status`)
      .set('Authorization', `Bearer ${kdsToken()}`)
      .send({ status: 'ready' });

    expect(res.status).toBe(200);
    expect(res.body.data.order.status).toBe('ready');
    expect(advanceOrderStatusForKds).toHaveBeenCalledWith(ORDER_ID, CAFE_ID, 'ready');
    expect(emitKdsServerToClient).toHaveBeenCalledWith(CAFE_ID, {
      type: 'kds:order:updated',
      order,
    });
    expect(emitCustomerServerToClient).toHaveBeenCalledWith(ORDER_ID, {
      type: 'customerOrderStatusUpdated',
      orderId: ORDER_ID,
      cafeId: CAFE_ID,
      status: 'ready',
    });
  });

  it('demotes ready → confirmed', async () => {
    const order = mockOrder('confirmed');
    advanceOrderStatusForKds.mockResolvedValue(order);

    const app = await appWithKdsRouter();
    const res = await request(app)
      .post(`${API_VERSION_PREFIX}/kds/orders/${ORDER_ID}/status`)
      .set('Authorization', `Bearer ${kdsToken()}`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(200);
    expect(advanceOrderStatusForKds).toHaveBeenCalledWith(ORDER_ID, CAFE_ID, 'confirmed');
  });

  it('rejects invalid status values', async () => {
    const app = await appWithKdsRouter();
    const res = await request(app)
      .post(`${API_VERSION_PREFIX}/kds/orders/${ORDER_ID}/status`)
      .set('Authorization', `Bearer ${kdsToken()}`)
      .send({ status: 'completed' });

    expect(res.status).toBe(400);
    expect(advanceOrderStatusForKds).not.toHaveBeenCalled();
  });
});
