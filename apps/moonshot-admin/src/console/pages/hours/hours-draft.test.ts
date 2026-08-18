import { describe, expect, it } from 'vitest';
import { defaultWeekdayCafeHours } from '@moonshot/domain';
import {
  dayWindowsError,
  draftToHours,
  hoursDraftError,
  hoursToDraft,
  intervalOrderError,
} from './hours-draft.js';

describe('hours draft', () => {
  it('round-trips a closed Sunday', () => {
    const hours = defaultWeekdayCafeHours();
    expect(hours.sun).toEqual([]);
    const draft = hoursToDraft(hours);
    expect(draft.sun.intervals).toEqual([]);
    expect(draftToHours(draft).sun).toEqual([]);
    expect(hoursDraftError(draft)).toBeNull();
  });

  it('keeps a split shift', () => {
    const hours = defaultWeekdayCafeHours();
    hours.wed = [
      { open: '08:00', close: '11:30' },
      { open: '12:30', close: '16:00' },
    ];
    const draft = hoursToDraft(hours);
    expect(draftToHours(draft).wed).toEqual(hours.wed);
    expect(dayWindowsError(draft.wed.intervals)).toBeNull();
  });

  it('rejects open at or after close', () => {
    expect(intervalOrderError('16:00', '08:00')).toBe('Close must be after open');
    expect(intervalOrderError('08:00', '08:00')).toBe('Close must be after open');
    expect(intervalOrderError('08:00', '16:00')).toBeNull();
  });

  it('rejects overlapping windows on the same day', () => {
    expect(
      dayWindowsError([
        { open: '08:00', close: '12:00' },
        { open: '11:00', close: '16:00' },
      ]),
    ).toBe('These times overlap');
  });

  it('allows adjacent windows that only touch', () => {
    expect(
      dayWindowsError([
        { open: '08:00', close: '11:30' },
        { open: '11:30', close: '16:00' },
      ]),
    ).toBeNull();
  });
});
