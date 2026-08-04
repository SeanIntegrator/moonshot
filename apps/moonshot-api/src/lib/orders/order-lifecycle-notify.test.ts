import type { NormalisedOrder } from '@moonshot/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const applyLoyaltyAfterKdsComplete = vi.hoisted(() => vi.fn());
const emitCustomerServerToClient = vi.hoisted(() => vi.fn());
const emitKdsServerToClient = vi.hoisted(() => vi.fn());
const findCafeById = vi.hoisted(() => vi.fn());
const recomputePickupEtasForCafe = vi.hoisted(() => vi.fn());

vi.mock('../loyalty-after-kds-complete.js', () => ({
  applyLoyaltyAfterKdsComplete,
}));

vi.mock('../../realtime/customer-events.js', () => ({
  emitCustomerServerToClient,
}));

vi.mock('../../realtime/kds-events.js', () => ({
  emitKdsServerToClient,
}));

vi.mock('../cafes-repository.js', () => ({
  findCafeById,
}));

vi.mock('../pickup-eta.js', () => ({
  recomputePickupEtasForCafe,
}));

const CAFE_ID = '00000000-0000-0000-0000-00000000bbbb';
const ORDER_ID = '00000000-0000-0000-0000-00000000dddd';
const USER_ID = '00000000-0000-0000-0000-00000000cccc';

function mockOrder(): NormalisedOrder {
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
  };
}

describe('notifyOrderCompleted', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    findCafeById.mockResolvedValue({
      cafeId: CAFE_ID,
      kdsConfig: { cafeId: CAFE_ID },
    });
    recomputePickupEtasForCafe.mockResolvedValue(undefined);
  });

  it('emits customerOrderCompleted with loyalty when apply succeeds', async () => {
    applyLoyaltyAfterKdsComplete.mockResolvedValue({
      applied: true,
      stamps: 3,
      stampsPerReward: 10,
      rewardsAvailable: 0,
    });

    const { notifyOrderCompleted } = await import('./order-lifecycle-notify.js');

    await notifyOrderCompleted({
      db: {} as never,
      cafeId: CAFE_ID,
      order: mockOrder(),
    });

    expect(emitKdsServerToClient).toHaveBeenCalledWith(CAFE_ID, {
      type: 'kds:order:removed',
      orderId: ORDER_ID,
    });
    expect(emitCustomerServerToClient).toHaveBeenCalledWith(ORDER_ID, {
      type: 'customerOrderCompleted',
      orderId: ORDER_ID,
      cafeId: CAFE_ID,
      completedAt: '2026-06-29T17:58:00.000Z',
      userId: USER_ID,
      loyalty: { stamps: 3, stampsPerReward: 10, rewardsAvailable: 0 },
    });
  });

  it('emits customerOrderCompleted without loyalty when apply fails', async () => {
    applyLoyaltyAfterKdsComplete.mockRejectedValue(new Error('ledger locked'));

    const { notifyOrderCompleted } = await import('./order-lifecycle-notify.js');

    await notifyOrderCompleted({
      db: {} as never,
      cafeId: CAFE_ID,
      order: mockOrder(),
    });

    expect(emitCustomerServerToClient).toHaveBeenCalledWith(ORDER_ID, {
      type: 'customerOrderCompleted',
      orderId: ORDER_ID,
      cafeId: CAFE_ID,
      completedAt: '2026-06-29T17:58:00.000Z',
      userId: USER_ID,
    });
  });

  it('emits customerOrderCompleted without loyalty when apply overruns the budget', async () => {
    vi.useFakeTimers();
    applyLoyaltyAfterKdsComplete.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                applied: true,
                stamps: 1,
                stampsPerReward: 10,
                rewardsAvailable: 0,
              }),
            5000,
          );
        }),
    );

    const { notifyOrderCompleted } = await import('./order-lifecycle-notify.js');

    const done = notifyOrderCompleted({
      db: {} as never,
      cafeId: CAFE_ID,
      order: mockOrder(),
    });

    await vi.advanceTimersByTimeAsync(2000);
    await done;

    expect(emitCustomerServerToClient).toHaveBeenCalledWith(ORDER_ID, {
      type: 'customerOrderCompleted',
      orderId: ORDER_ID,
      cafeId: CAFE_ID,
      completedAt: '2026-06-29T17:58:00.000Z',
      userId: USER_ID,
    });
  });
});
