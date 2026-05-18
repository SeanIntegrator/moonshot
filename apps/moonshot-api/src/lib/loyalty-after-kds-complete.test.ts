import { describe, expect, it } from 'vitest';
import { isCompletedWithinPickupGrace } from './loyalty-after-kds-complete.js';

describe('isCompletedWithinPickupGrace', () => {
  it('does not count orders without pickup time as on-time', () => {
    expect(
      isCompletedWithinPickupGrace({
        pickupTime: null,
        completedAt: '2026-05-18T12:00:00.000Z',
      }),
    ).toBe(false);
  });

  it('counts completion within two minutes of pickup time as on-time', () => {
    expect(
      isCompletedWithinPickupGrace({
        pickupTime: '2026-05-18T12:00:00.000Z',
        completedAt: '2026-05-18T12:01:59.000Z',
      }),
    ).toBe(true);
  });

  it('does not count completion after the pickup grace window', () => {
    expect(
      isCompletedWithinPickupGrace({
        pickupTime: '2026-05-18T12:00:00.000Z',
        completedAt: '2026-05-18T12:02:01.000Z',
      }),
    ).toBe(false);
  });
});
