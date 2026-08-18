import { describe, expect, it } from 'vitest';
import { WEEKDAY_PILLS_LONG } from './weekday-pills.js';

describe('WEEKDAY_PILLS_LONG', () => {
  it('emits en-GB long weekday names for loyalty doubleStampDays', () => {
    expect(WEEKDAY_PILLS_LONG.map((d) => d.value)).toEqual([
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ]);
  });
});
