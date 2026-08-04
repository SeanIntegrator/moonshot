import type { CafeFeatures, NormalisedOrder } from '@moonshot/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const poolConnect = vi.hoisted(() => vi.fn());
const ensureCafeMembership = vi.hoisted(() => vi.fn());
const findCafeById = vi.hoisted(() => vi.fn());
const applyLedgerStampAndRewards = vi.hoisted(() => vi.fn());
const emitCustomerServerToClient = vi.hoisted(() => vi.fn());

vi.mock('../db.js', () => ({
  pool: { connect: poolConnect },
}));

vi.mock('./cafe/cafe-membership.js', () => ({
  ensureCafeMembership,
}));

vi.mock('./cafes-repository.js', () => ({
  findCafeById,
}));

vi.mock('./loyalty/apply-ledger-on-complete.js', () => ({
  applyLedgerStampAndRewards,
}));

vi.mock('../realtime/customer-events.js', () => ({
  emitCustomerServerToClient,
}));

const CAFE_ID = '00000000-0000-0000-0000-00000000bbbb';
const USER_ID = '00000000-0000-0000-0000-00000000cccc';
const ORDER_ID = '00000000-0000-0000-0000-00000000dddd';

function mockOrder(overrides: Partial<NormalisedOrder> = {}): NormalisedOrder {
  return {
    id: ORDER_ID,
    cafeId: CAFE_ID,
    source: 'app',
    customerName: 'Sean',
    customerId: USER_ID,
    items: [],
    notes: null,
    orderType: 'takeaway',
    status: 'completed',
    paymentStatus: 'paid',
    totalMinor: 724,
    currency: 'GBP',
    pickup: {
      quotedPickupTime: '2026-06-29T17:00:00.000Z',
      pickupTime: '2026-06-29T17:59:00.000Z',
      completedAt: '2026-06-29T17:58:00.000Z',
      etaMode: 'auto',
    },
    createdAt: '2026-06-29T17:30:00.000Z',
    updatedAt: '2026-06-29T17:58:00.000Z',
    posOrderId: null,
    editToken: null,
    parentOrderId: null,
    ...overrides,
  };
}

function mockFeatures(overrides: Partial<CafeFeatures> = {}): CafeFeatures {
  return {
    loyalty: {
      enabled: true,
      stampsPerReward: 10,
      rewardDescription: 'Free drink',
      doubleStampDays: [],
    },
    events: null,
    promotions: null,
    order_ahead: {
      enabled: true,
      paymentProvider: 'stripe',
      pickupTimeEnabled: true,
      defaultPickupMinutes: 10,
      maxPickupMinutes: 60,
      notesEnabled: true,
    },
    review_nudge: null,
    saved_orders: null,
    whatsapp_ordering: null,
    ...overrides,
  };
}

function mockClient() {
  const client = {
    query: vi.fn(),
    release: vi.fn(),
  };
  client.query.mockImplementation(async (sql: string) => {
    if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
      return { rows: [] };
    }
    if (typeof sql === 'string' && sql.includes('UPDATE cafe_users SET')) {
      return {
        rows: [{ on_time_completed_orders: 1, review_prompt_state: 'not_shown' }],
      };
    }
    return { rows: [] };
  });
  return client;
}

describe('applyLoyaltyAfterKdsComplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureCafeMembership.mockResolvedValue(undefined);
    applyLedgerStampAndRewards.mockResolvedValue({
      cardProgress: 1,
      inserted: true,
      rewardsAvailable: 0,
    });
    findCafeById.mockResolvedValue({
      cafeId: CAFE_ID,
      features: mockFeatures(),
      timezone: 'Europe/London',
    });
    poolConnect.mockImplementation(async () => mockClient());
  });

  it('returns applied loyalty payload for a signed-in Stripe-confirmed app order', async () => {
    const { applyLoyaltyAfterKdsComplete } = await import('./loyalty-after-kds-complete.js');

    const result = await applyLoyaltyAfterKdsComplete({
      cafeId: CAFE_ID,
      order: mockOrder({ paymentStatus: 'paid' }),
    });

    expect(ensureCafeMembership).toHaveBeenCalledWith({
      db: expect.any(Object),
      cafeId: CAFE_ID,
      userId: USER_ID,
    });
    expect(applyLedgerStampAndRewards).toHaveBeenCalled();
    expect(result).toEqual({
      applied: true,
      stamps: 1,
      stampsPerReward: 10,
      rewardsAvailable: 0,
    });
  });

  it('returns applied payload for pay-in-store unpaid orders', async () => {
    const { applyLoyaltyAfterKdsComplete } = await import('./loyalty-after-kds-complete.js');

    const result = await applyLoyaltyAfterKdsComplete({
      cafeId: CAFE_ID,
      order: mockOrder({ paymentStatus: 'unpaid' }),
    });

    expect(applyLedgerStampAndRewards).toHaveBeenCalled();
    expect(result.applied).toBe(true);
  });

  it('returns applied:false for guest orders without a customer id', async () => {
    const { applyLoyaltyAfterKdsComplete } = await import('./loyalty-after-kds-complete.js');

    const result = await applyLoyaltyAfterKdsComplete({
      cafeId: CAFE_ID,
      order: mockOrder({ customerId: null }),
    });

    expect(ensureCafeMembership).not.toHaveBeenCalled();
    expect(applyLedgerStampAndRewards).not.toHaveBeenCalled();
    expect(result).toEqual({ applied: false });
  });

  it('returns applied:false and does not double-apply counters when the stamp ledger row already exists', async () => {
    applyLedgerStampAndRewards.mockResolvedValue({
      cardProgress: 4,
      inserted: false,
      rewardsAvailable: 0,
    });
    const client = mockClient();
    poolConnect.mockResolvedValue(client);

    const { applyLoyaltyAfterKdsComplete } = await import('./loyalty-after-kds-complete.js');

    const result = await applyLoyaltyAfterKdsComplete({
      cafeId: CAFE_ID,
      order: mockOrder(),
    });

    const counterUpdates = client.query.mock.calls.filter(
      ([sql]) => typeof sql === 'string' && sql.includes('total_orders = total_orders + 1'),
    );
    expect(counterUpdates).toHaveLength(0);
    expect(result).toEqual({ applied: false });
  });

  it('returns reset progress and rewardsAvailable after punch-card rollover', async () => {
    applyLedgerStampAndRewards.mockResolvedValue({
      cardProgress: 0,
      inserted: true,
      rewardsAvailable: 1,
    });

    const { applyLoyaltyAfterKdsComplete } = await import('./loyalty-after-kds-complete.js');

    const result = await applyLoyaltyAfterKdsComplete({
      cafeId: CAFE_ID,
      order: mockOrder(),
    });

    expect(result).toEqual({
      applied: true,
      stamps: 0,
      stampsPerReward: 10,
      rewardsAvailable: 1,
    });
  });

  it('passes double-stamp delta through to the ledger helper', async () => {
    // Monday 2026-06-29 in Europe/London
    findCafeById.mockResolvedValue({
      cafeId: CAFE_ID,
      features: mockFeatures({
        loyalty: {
          enabled: true,
          stampsPerReward: 10,
          rewardDescription: 'Free drink',
          doubleStampDays: ['Monday'],
        },
      }),
      timezone: 'Europe/London',
    });
    applyLedgerStampAndRewards.mockResolvedValue({
      cardProgress: 2,
      inserted: true,
      rewardsAvailable: 0,
    });

    const { applyLoyaltyAfterKdsComplete } = await import('./loyalty-after-kds-complete.js');

    const result = await applyLoyaltyAfterKdsComplete({
      cafeId: CAFE_ID,
      order: mockOrder({
        pickup: {
          quotedPickupTime: '2026-06-29T17:00:00.000Z',
          pickupTime: '2026-06-29T17:59:00.000Z',
          completedAt: '2026-06-29T17:58:00.000Z',
          etaMode: 'auto',
        },
      }),
    });

    expect(applyLedgerStampAndRewards).toHaveBeenCalledWith(
      expect.objectContaining({ stampsDelta: 2 }),
    );
    expect(result).toEqual({
      applied: true,
      stamps: 2,
      stampsPerReward: 10,
      rewardsAvailable: 0,
    });
  });
});
