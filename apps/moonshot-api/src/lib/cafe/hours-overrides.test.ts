import { describe, expect, it } from 'vitest';
import { validateHoursOverrideBody } from './hours-overrides.js';

describe('validateHoursOverrideBody', () => {
  it('accepts a closed bank holiday', () => {
    const result = validateHoursOverrideBody({
      date: '2026-08-25',
      label: 'bank holiday',
      closed: true,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      date: '2026-08-25',
      label: 'bank holiday',
      closed: true,
      intervals: [],
    });
  });

  it('accepts custom hours', () => {
    const result = validateHoursOverrideBody({
      date: '2026-09-06',
      label: 'street market',
      closed: false,
      intervals: [{ open: '07:00', close: '17:00' }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.intervals).toEqual([{ open: '07:00', close: '17:00' }]);
  });

  it('rejects overlapping custom windows', () => {
    const result = validateHoursOverrideBody({
      date: '2026-09-06',
      closed: false,
      intervals: [
        { open: '08:00', close: '12:00' },
        { open: '11:00', close: '16:00' },
      ],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects an open day with no intervals', () => {
    const result = validateHoursOverrideBody({
      date: '2026-09-06',
      closed: false,
      intervals: [],
    });
    expect(result.ok).toBe(false);
  });
});
