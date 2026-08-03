import type { NormalisedOrder } from '@moonshot/types';
import { API_VERSION_PREFIX } from '@moonshot/domain';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Regression guard for the KDS `Done` happy + degraded paths:
 *   - completing the order is the *primary* request; failure here returns 500
 *   - loyalty and ETA recompute are *post-success* side effects; failures here
 *     must be swallowed so the kitchen never sees `Done` fail after the order
 *     row has already moved to `completed`.
 *
 * We mock the data-access + side-effect modules and mount only the KDS router.
 */

const completeOrderForKds = vi.hoisted(() => vi.fn());
const applyLoyaltyAfterKdsComplete = vi.hoisted(() => vi.fn());
const recomputePickupEtasForCafe = vi.hoisted(() => vi.fn());
const emitKdsServerToClient = vi.hoisted(() => vi.fn());
const emitCustomerServerToClient = vi.hoisted(() => vi.fn());
const poolQuery = vi.hoisted(() => vi.fn());

vi.mock('../lib/orders/order-kds.js', () => ({
  completeOrderForKds,
  listOpenOrdersForKds: vi.fn(),
  listRecentCompletedOrdersForKds: vi.fn(),
  recallCompletedOrderForKds: vi.fn(),
  recallLastCompletedOrderForKds: vi.fn(),
  advanceOrderStatusForKds: vi.fn(),
  stretchOrderEtaForKds: vi.fn(),
}));

vi.mock('../lib/loyalty-after-kds-complete.js', () => ({
  applyLoyaltyAfterKdsComplete,
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

vi.mock('../lib/cafe/cafe-map.js', () => ({
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

function mockOrder(): NormalisedOrder {
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
      completedAt: '2026-05-18T12:00:00.000Z',
      etaMode: 'auto',
    },
    createdAt: '2026-05-18T12:00:00.000Z',
    updatedAt: '2026-05-18T12:00:00.000Z',
    posOrderId: null,
    editToken: null,
    parentOrderId: null,
  };
}

async function appWithKdsRouter() {
  /* Dynamic import so the mocks above are honoured by the module under test. */
  const { kdsRouter } = await import('./kds.js');
  const { errorHandler } = await import('../middleware/error-handler.js');
  const app = express();
  app.use(express.json());
  app.use(`${API_VERSION_PREFIX}/kds`, kdsRouter);
  app.use(errorHandler);
  return app;
}

describe('POST /api/v1/kds/orders/:orderId/complete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'kds-complete-test-secret';
    poolQuery.mockResolvedValue({ rows: [{ id: CAFE_ID, kds_config: {} }] });
  });

  it('returns 200 and the completed order on the happy path', async () => {
    const order = mockOrder();
    completeOrderForKds.mockResolvedValue(order);
    applyLoyaltyAfterKdsComplete.mockResolvedValue(undefined);
    recomputePickupEtasForCafe.mockResolvedValue(undefined);

    const app = await appWithKdsRouter();
    const res = await request(app)
      .post(`${API_VERSION_PREFIX}/kds/orders/${ORDER_ID}/complete`)
      .set('Authorization', `Bearer ${kdsToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.order.id).toBe(ORDER_ID);
    expect(emitKdsServerToClient).toHaveBeenCalled();
    expect(emitCustomerServerToClient).toHaveBeenCalled();
    expect(applyLoyaltyAfterKdsComplete).toHaveBeenCalled();
    expect(recomputePickupEtasForCafe).toHaveBeenCalled();
  });

  it('still returns 200 when applyLoyaltyAfterKdsComplete throws', async () => {
    completeOrderForKds.mockResolvedValue(mockOrder());
    applyLoyaltyAfterKdsComplete.mockRejectedValue(new Error('loyalty ledger blew up'));
    recomputePickupEtasForCafe.mockResolvedValue(undefined);

    const app = await appWithKdsRouter();
    const res = await request(app)
      .post(`${API_VERSION_PREFIX}/kds/orders/${ORDER_ID}/complete`)
      .set('Authorization', `Bearer ${kdsToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(emitKdsServerToClient).toHaveBeenCalled();
    expect(emitCustomerServerToClient).toHaveBeenCalled();
  });

  it('still returns 200 when ETA recompute throws', async () => {
    completeOrderForKds.mockResolvedValue(mockOrder());
    applyLoyaltyAfterKdsComplete.mockResolvedValue(undefined);
    recomputePickupEtasForCafe.mockRejectedValue(new Error('pickup eta down'));

    const app = await appWithKdsRouter();
    const res = await request(app)
      .post(`${API_VERSION_PREFIX}/kds/orders/${ORDER_ID}/complete`)
      .set('Authorization', `Bearer ${kdsToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('returns 500 if the primary completion itself errors', async () => {
    completeOrderForKds.mockRejectedValue(new Error('db blip'));

    const app = await appWithKdsRouter();
    const res = await request(app)
      .post(`${API_VERSION_PREFIX}/kds/orders/${ORDER_ID}/complete`)
      .set('Authorization', `Bearer ${kdsToken()}`);

    expect(res.status).toBe(500);
    expect(res.body.ok).toBe(false);
  });

  it('returns 404 when completeOrderForKds reports no rows updated', async () => {
    completeOrderForKds.mockResolvedValue(null);

    const app = await appWithKdsRouter();
    const res = await request(app)
      .post(`${API_VERSION_PREFIX}/kds/orders/${ORDER_ID}/complete`)
      .set('Authorization', `Bearer ${kdsToken()}`);

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
    expect(applyLoyaltyAfterKdsComplete).not.toHaveBeenCalled();
    expect(recomputePickupEtasForCafe).not.toHaveBeenCalled();
  });
});
