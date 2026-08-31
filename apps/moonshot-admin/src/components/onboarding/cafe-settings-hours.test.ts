import { describe, expect, it } from 'vitest';
import {
  DEFAULT_INTERVAL,
  draftToHours,
  hoursDraftError,
  hoursToDraft,
  intervalOrderError,
} from '../../console/pages/hours/hours-draft.js';
import { defaultWeekdayCafeHours } from '@moonshot/domain';

describe('hours draft transforms for onboarding', () => {
  it('round-trips default weekday hours', () => {
    const hours = defaultWeekdayCafeHours();
    const draft = hoursToDraft(hours);
    expect(draftToHours(draft)).toEqual(hours);
    expect(hoursDraftError(draft)).toBeNull();
  });

  it('rejects close-before-open intervals', () => {
    expect(intervalOrderError('16:00', '08:00')).toMatch(/after open/i);
    expect(intervalOrderError(DEFAULT_INTERVAL.open, DEFAULT_INTERVAL.close)).toBeNull();
  });
});
