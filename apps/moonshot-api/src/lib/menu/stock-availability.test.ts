import { describe, expect, it } from 'vitest';
import { availabilityFromOutUntil, optionIsSellable, outUntilForAvailability } from '@moonshot/domain';

describe('availabilityFromOutUntil', () => {
  const now = new Date('2026-08-18T10:00:00.000Z');

  it('treats a missing row as in stock', () => {
    expect(availabilityFromOutUntil(undefined, now)).toBe('in');
  });

  it('treats a null out_until as out', () => {
    expect(availabilityFromOutUntil(null, now)).toBe('out');
  });

  it('treats a future out_until as out today', () => {
    expect(availabilityFromOutUntil(new Date('2026-08-19T07:00:00.000Z'), now)).toBe('out_today');
  });

  it('lazily expires a past out_until', () => {
    expect(availabilityFromOutUntil(new Date('2026-08-18T09:00:00.000Z'), now)).toBe('in');
  });
});

describe('optionIsSellable', () => {
  it('is only true for in stock', () => {
    expect(optionIsSellable('in')).toBe(true);
    expect(optionIsSellable('out_today')).toBe(false);
    expect(optionIsSellable('out')).toBe(false);
  });
});

describe('outUntilForAvailability', () => {
  const nextOpen = new Date('2026-08-19T07:00:00.000Z');

  it('maps the three UI states onto row values', () => {
    expect(outUntilForAvailability('in', nextOpen)).toBeUndefined();
    expect(outUntilForAvailability('out', nextOpen)).toBeNull();
    expect(outUntilForAvailability('out_today', nextOpen)).toEqual(nextOpen);
  });
});
