import { describe, expect, it } from 'vitest';
import { defaultWeekdayCafeHours } from '@moonshot/domain';
import { parseStoredCart } from './cart-storage.js';
import {
  clampPickupDelayMinutes,
  pickupDelayOptions,
  pickupDelaysForCafe,
} from './pickup-delay-options.js';

describe('parseStoredCart', () => {
  it('returns empty for null / corrupt', () => {
    expect(parseStoredCart(null)).toEqual({ lines: [], pickupDelayMinutes: 0 });
    expect(parseStoredCart('not-json')).toEqual({ lines: [], pickupDelayMinutes: 0 });
    expect(parseStoredCart('{"lines":"nope"}')).toEqual({ lines: [], pickupDelayMinutes: 0 });
  });

  it('keeps valid lines and delay', () => {
    const raw = JSON.stringify({
      pickupDelayMinutes: 20,
      lines: [
        {
          key: 'a',
          menuItemId: '11111111-1111-4111-8111-111111111111',
          sizeId: null,
          quantity: 2,
          modifiers: [{ groupId: 'g', optionId: 'o' }],
          allergens: ['milk'],
        },
      ],
    });
    const cart = parseStoredCart(raw);
    expect(cart.pickupDelayMinutes).toBe(20);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]!.quantity).toBe(2);
  });

  it('drops invalid lines', () => {
    const raw = JSON.stringify({
      pickupDelayMinutes: 10,
      lines: [{ key: 'bad', menuItemId: 'x', quantity: 0, modifiers: [], allergens: [] }],
    });
    expect(parseStoredCart(raw).lines).toHaveLength(0);
  });
});

describe('pickupDelayOptions', () => {
  it('filters by max and includes max when not on the step list', () => {
    expect(pickupDelayOptions(60)).toEqual([0, 10, 20, 30, 40, 50, 60]);
    expect(pickupDelayOptions(25)).toEqual([0, 10, 20, 25]);
    expect(pickupDelayOptions(0)).toEqual([0]);
  });

  it('drops delays the last-order filter rejects', () => {
    expect(pickupDelayOptions(60, (d) => d <= 10)).toEqual([0, 10]);
  });
});

describe('clampPickupDelayMinutes', () => {
  it('falls back to ASAP when the stored delay is no longer offered', () => {
    expect(clampPickupDelayMinutes(40, [0, 10])).toBe(0);
    expect(clampPickupDelayMinutes(10, [0, 10])).toBe(10);
    expect(clampPickupDelayMinutes(0, [])).toBe(0);
  });
});

describe('pickupDelaysForCafe', () => {
  it('keeps only delays that still land before the last-order slot', () => {
    const cafe = {
      timezone: 'UTC',
      hours: defaultWeekdayCafeHours(),
      lastOrderBufferMinutes: 20,
    };
    // Tuesday 15:25, close 16:00, last slot 15:40 → 20+ min delays miss the slot.
    const now = new Date('2026-08-11T15:25:00.000Z');
    expect(pickupDelaysForCafe(60, cafe, now)).toEqual([0, 10]);
  });
});
