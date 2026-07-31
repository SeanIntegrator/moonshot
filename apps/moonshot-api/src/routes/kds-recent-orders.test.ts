import { API_VERSION_PREFIX, type NormalisedOrder } from '@moonshot/types';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const listRecentCompletedOrdersForKds = vi.hoisted(() => vi.fn());
const recallCompletedOrderForKds = vi.hoisted(() => vi.fn());
const recomputePickupEtasForCafe = vi.hoisted(() => vi.fn());
const emitKdsServerToClient = vi.hoisted(() => vi.fn());
const emitCustomerServerToClient = vi.hoisted(() => vi.fn());
const poolQuery = vi.hoisted(() => vi.fn());

vi.mock('../lib/orders/order-kds.js', () => ({
  completeOrderForKds: vi.fn(),
  listOpenOrdersForKds: vi.fn(),
  listRecentCompletedOrdersForKds,
  recallCompletedOrderForKds,
  recallLastCompletedOrderForKds: vi.fn(),
  advanceOrderStatusForKds: vi.fn(),
  stretchOrderEtaForKds: vi.fn(),
}));

vi.mock('../lib/loyalty-after-kds-complete.js', () => ({
  applyLoyaltyAfterKdsComplete: vi.fn(),
}));

vi.mock('../lib/pickup-eta.js', () => ({
  recomputePickupEtasForCafe,
}));

vi.mock('../realtime/kds-events.js', () => ({
  emitKdsServerToClient,
  kdsCafeRoom: (cafeId: string) => `kds:cafe:${cafeId}`,
}));

vi.mock('../realtime/customer-events.js', () => ({
  emitCustomerServerToClient,
}));

vi.mock('../db.js', () => ({
  pool: {
    query: poolQuery,
  },
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

function mockCompletedOrder(): NormalisedOrder {
  return {
    id: ORDER_ID,
    cafeId: CAFE_ID,
    source: 'app',
    customerName: 'Sam',
    customerId: '00000000-0000-0000-0000-00000000dddd',
    items: [],
    notes: null,
    orderType: 'takeaway',
    status: 'completed',
    paymentStatus: 'unpaid',
    totalMinor: 350,
    currency: 'GBP',
    pickup: {
      quotedPickupTime: null,
      pickupTime: null,
      completedAt: '2026-05-18T12:05:00.000Z',
      etaMode: 'auto',
    },
    createdAt: '2026-05-18T12:00:00.000Z',
    updatedAt: '2026-05-18T12:05:00.000Z',
    posOrderId: null,
    editToken: null,
    parentOrderId: null,
  };
}

function mockRecalledOrder(): NormalisedOrder {
  return {
    ...mockCompletedOrder(),
    status: 'confirmed',
    pickup: {
      quotedPickupTime: null,
      pickupTime: null,
      completedAt: null,
      etaMode: 'auto',
    },
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

describe('GET /api/v1/kds/orders/recent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'kds-recent-test-secret';
  });

  it('returns 200 and recent completed orders', async () => {
    const orders = [mockCompletedOrder()];
    listRecentCompletedOrdersForKds.mockResolvedValue(orders);

    const app = await appWithKdsRouter();
    const res = await request(app)
      .get(`${API_VERSION_PREFIX}/kds/orders/recent`)
      .set('Authorization', `Bearer ${kdsToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.orders).toHaveLength(1);
    expect(res.body.data.orders[0].id).toBe(ORDER_ID);
    expect(listRecentCompletedOrdersForKds).toHaveBeenCalledWith(CAFE_ID);
  });

  it('returns 200 with an empty list', async () => {
    listRecentCompletedOrdersForKds.mockResolvedValue([]);

    const app = await appWithKdsRouter();
    const res = await request(app)
      .get(`${API_VERSION_PREFIX}/kds/orders/recent`)
      .set('Authorization', `Bearer ${kdsToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.orders).toEqual([]);
  });

  it('returns 401 without a KDS token', async () => {
    const app = await appWithKdsRouter();
    const res = await request(app).get(`${API_VERSION_PREFIX}/kds/orders/recent`);

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(listRecentCompletedOrdersForKds).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/kds/orders/:orderId/recall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'kds-recent-test-secret';
    poolQuery.mockResolvedValue({ rows: [{ id: CAFE_ID, kds_config: {} }] });
  });

  it('returns 200 and reopens the completed order', async () => {
    const order = mockRecalledOrder();
    recallCompletedOrderForKds.mockResolvedValue(order);
    recomputePickupEtasForCafe.mockResolvedValue(undefined);

    const app = await appWithKdsRouter();
    const res = await request(app)
      .post(`${API_VERSION_PREFIX}/kds/orders/${ORDER_ID}/recall`)
      .set('Authorization', `Bearer ${kdsToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.order.id).toBe(ORDER_ID);
    expect(res.body.data.order.status).toBe('confirmed');
    expect(recallCompletedOrderForKds).toHaveBeenCalledWith(ORDER_ID, CAFE_ID);
    expect(emitKdsServerToClient).toHaveBeenCalledWith(CAFE_ID, {
      type: 'kds:order:new',
      order,
    });
    expect(emitCustomerServerToClient).toHaveBeenCalledWith(ORDER_ID, {
      type: 'customerOrderStatusUpdated',
      orderId: ORDER_ID,
      cafeId: CAFE_ID,
      status: 'confirmed',
    });
    expect(recomputePickupEtasForCafe).toHaveBeenCalled();
  });

  it('still returns 200 when ETA recompute throws', async () => {
    recallCompletedOrderForKds.mockResolvedValue(mockRecalledOrder());
    recomputePickupEtasForCafe.mockRejectedValue(new Error('pickup eta down'));

    const app = await appWithKdsRouter();
    const res = await request(app)
      .post(`${API_VERSION_PREFIX}/kds/orders/${ORDER_ID}/recall`)
      .set('Authorization', `Bearer ${kdsToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 404 when the order is not recallable', async () => {
    recallCompletedOrderForKds.mockResolvedValue(null);

    const app = await appWithKdsRouter();
    const res = await request(app)
      .post(`${API_VERSION_PREFIX}/kds/orders/${ORDER_ID}/recall`)
      .set('Authorization', `Bearer ${kdsToken()}`);

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
    expect(emitKdsServerToClient).not.toHaveBeenCalled();
    expect(recomputePickupEtasForCafe).not.toHaveBeenCalled();
  });

  it('returns 401 without a KDS token', async () => {
    const app = await appWithKdsRouter();
    const res = await request(app).post(
      `${API_VERSION_PREFIX}/kds/orders/${ORDER_ID}/recall`,
    );

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
    expect(recallCompletedOrderForKds).not.toHaveBeenCalled();
  });
});
