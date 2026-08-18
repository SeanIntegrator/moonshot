import { describe, expect, it } from 'vitest';
import { isPickupTimingValid, pickupTimingError } from './pickup-timing.js';

describe('pickupTimingError', () => {
  it('rejects earliest after furthest', () => {
    expect(pickupTimingError(90, 60)).toBe('Furthest ahead must be more than earliest pickup.');
    expect(isPickupTimingValid(90, 60)).toBe(false);
  });

  it('allows equal and earliest before furthest', () => {
    expect(pickupTimingError(10, 10)).toBeNull();
    expect(pickupTimingError(10, 60)).toBeNull();
    expect(isPickupTimingValid(10, 60)).toBe(true);
  });
});
