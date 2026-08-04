import type { CafeFeatures, NormalisedOrder } from '@moonshot/types';
import type { PoolClient } from 'pg';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applyLedgerStampAndRewards } from './apply-ledger-on-complete.js';

const lockMembershipRow = vi.hoisted(() => vi.fn());
const insertStampEarnIfAbsent = vi.hoisted(() => vi.fn());
const insertLoyaltyRewardRow = vi.hoisted(() => vi.fn());
const insertRewardEarned = vi.hoisted(() => vi.fn());
const countUnredeemedRewards = vi.hoisted(() => vi.fn());

vi.mock('./repository.js', () => ({
  lockMembershipRow,
  insertStampEarnIfAbsent,
  insertLoyaltyRewardRow,
  insertRewardEarned,
  countUnredeemedRewards,
}));

function mockOrder(): NormalisedOrder {
  return {
    id: '00000000-0000-0000-0000-00000000aaaa',
    cafeId: '00000000-0000-0000-0000-00000000bbbb',
    source: 'app',
    customerName: 'Sam',
    customerId: '00000000-0000-0000-0000-00000000cccc',
    items: [],
    notes: null,
    orderType: 'takeaway',
    status: 'completed',
    paymentStatus: 'unpaid',
    totalMinor: 350,
    currency: 'GBP',
    pickup: { quotedPickupTime: null, pickupTime: null, completedAt: null, etaMode: 'auto' },
    createdAt: '2026-05-18T12:00:00.000Z',
    updatedAt: '2026-05-18T12:00:00.000Z',
    posOrderId: null,
    editToken: null,
    parentOrderId: null,
  };
}

function mockFeatures(stampsPerReward: number): CafeFeatures {
  return {
    loyalty: {
      enabled: true,
      stampsPerReward,
      rewardDescription: 'Free drink',
      doubleStampDays: [],
    },
    events: null,
    promotions: null,
    order_ahead: null,
    review_nudge: null,
    saved_orders: null,
    whatsapp_ordering: null,
  };
}

describe('applyLedgerStampAndRewards', () => {
  let client: PoolClient;

  beforeEach(() => {
    vi.clearAllMocks();
    /* Minimal PoolClient surface used by the function under test */
    client = { query: vi.fn() } as unknown as PoolClient;
    countUnredeemedRewards.mockResolvedValue(0);
  });

  it('returns inserted:false and leaves progress untouched when ledger row already exists', async () => {
    lockMembershipRow.mockResolvedValue({ cardProgress: 4 });
    insertStampEarnIfAbsent.mockResolvedValue({ inserted: false, transactionId: null });

    const result = await applyLedgerStampAndRewards({
      client,
      cafeId: 'cafe-1',
      userId: 'user-1',
      order: mockOrder(),
      features: mockFeatures(10),
      cafeTimezone: 'Europe/London',
      stampsDelta: 1,
    });

    expect(result).toEqual({ cardProgress: 4, inserted: false, rewardsAvailable: 0 });
    expect(insertLoyaltyRewardRow).not.toHaveBeenCalled();
    expect(insertRewardEarned).not.toHaveBeenCalled();
    expect(countUnredeemedRewards).not.toHaveBeenCalled();
    expect(client.query).not.toHaveBeenCalled();
  });

  it('issues a reward and resets progress when progress reaches the threshold', async () => {
    lockMembershipRow.mockResolvedValue({ cardProgress: 9 });
    insertStampEarnIfAbsent.mockResolvedValue({ inserted: true, transactionId: 'tx-1' });
    insertLoyaltyRewardRow.mockResolvedValue('reward-1');
    insertRewardEarned.mockResolvedValue('tx-2');
    countUnredeemedRewards.mockResolvedValue(1);

    const result = await applyLedgerStampAndRewards({
      client,
      cafeId: 'cafe-1',
      userId: 'user-1',
      order: mockOrder(),
      features: mockFeatures(10),
      cafeTimezone: 'Europe/London',
      stampsDelta: 1,
    });

    expect(result).toEqual({ cardProgress: 0, inserted: true, rewardsAvailable: 1 });
    expect(insertLoyaltyRewardRow).toHaveBeenCalledTimes(1);
    expect(insertRewardEarned).toHaveBeenCalledTimes(1);
    expect(countUnredeemedRewards).toHaveBeenCalledWith({
      pool: client,
      cafeId: 'cafe-1',
      userId: 'user-1',
    });
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE cafe_users SET loyalty_card_progress'),
      ['cafe-1', 'user-1', 0],
    );
  });

  it('issues multiple rewards in one apply when double-stamp + low threshold pushes past it twice', async () => {
    lockMembershipRow.mockResolvedValue({ cardProgress: 2 });
    insertStampEarnIfAbsent.mockResolvedValue({ inserted: true, transactionId: 'tx-1' });
    insertLoyaltyRewardRow.mockResolvedValue('reward-id');
    insertRewardEarned.mockResolvedValue('tx-r');
    countUnredeemedRewards.mockResolvedValue(2);

    const result = await applyLedgerStampAndRewards({
      client,
      cafeId: 'cafe-1',
      userId: 'user-1',
      order: mockOrder(),
      features: mockFeatures(3),
      cafeTimezone: 'Europe/London',
      stampsDelta: 5,
    });

    /* 2 + 5 = 7, threshold 3 → issue 2 rewards (subtract 6), remainder 1 */
    expect(result).toEqual({ cardProgress: 1, inserted: true, rewardsAvailable: 2 });
    expect(insertLoyaltyRewardRow).toHaveBeenCalledTimes(2);
    expect(insertRewardEarned).toHaveBeenCalledTimes(2);
  });

  it('throws when the cafe_users row is missing', async () => {
    lockMembershipRow.mockResolvedValue(null);

    await expect(
      applyLedgerStampAndRewards({
        client,
        cafeId: 'cafe-1',
        userId: 'user-1',
        order: mockOrder(),
        features: mockFeatures(10),
        cafeTimezone: 'Europe/London',
        stampsDelta: 1,
      }),
    ).rejects.toThrow(/cafe_users row missing/);
  });
});
