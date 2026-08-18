import { describe, expect, it } from 'vitest';
import {
  doubleStampSummary,
  isLoyaltyFormValid,
  loyaltyRewardError,
} from './loyalty-form.js';

describe('loyaltyRewardError', () => {
  it('rejects an empty reward when loyalty is on', () => {
    expect(loyaltyRewardError(true, '')).not.toBeNull();
    expect(loyaltyRewardError(true, '   ')).not.toBeNull();
    expect(isLoyaltyFormValid({ enabled: true, stamps: 10, reward: '' })).toBe(false);
  });

  it('allows an empty reward when loyalty is off', () => {
    expect(loyaltyRewardError(false, '')).toBeNull();
    expect(isLoyaltyFormValid({ enabled: false, stamps: 10, reward: '' })).toBe(true);
  });

  it('accepts a label when on', () => {
    expect(loyaltyRewardError(true, 'Any regular drink')).toBeNull();
    expect(isLoyaltyFormValid({ enabled: true, stamps: 10, reward: 'Any regular drink' })).toBe(
      true,
    );
  });
});

describe('doubleStampSummary', () => {
  it('uses long weekday names', () => {
    expect(doubleStampSummary([])).toMatch(/No double stamp days/);
    expect(doubleStampSummary(['Tuesday', 'Wednesday'])).toBe(
      'Two stamps on Tuesday and Wednesday.',
    );
  });
});
