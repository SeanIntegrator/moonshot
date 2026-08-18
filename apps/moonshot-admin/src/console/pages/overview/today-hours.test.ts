import { describe, expect, it } from 'vitest';
import { overviewHeroHeading, todayHoursLine } from './today-hours.js';
import type { CafeHours } from '@moonshot/types';

const weekday: CafeHours = {
  mon: [{ open: '08:00', close: '16:00' }],
  tue: [{ open: '08:00', close: '16:00' }],
  wed: [
    { open: '08:00', close: '11:30' },
    { open: '12:30', close: '16:00' },
  ],
  thu: [{ open: '08:00', close: '16:00' }],
  fri: [{ open: '08:00', close: '16:00' }],
  sat: [{ open: '08:00', close: '16:00' }],
  sun: [],
};

describe('todayHoursLine', () => {
  it('formats a single interval', () => {
    const tueMorning = new Date('2026-08-11T10:00:00.000Z'); // Tuesday
    expect(todayHoursLine(weekday, 'UTC', tueMorning)).toBe('Tuesday · 08:00 – 16:00');
  });

  it('joins split shifts', () => {
    const wed = new Date('2026-08-12T10:00:00.000Z'); // Wednesday
    expect(todayHoursLine(weekday, 'UTC', wed)).toBe(
      'Wednesday · 08:00 – 11:30 and 12:30 – 16:00',
    );
  });

  it('states closed Sunday', () => {
    const sun = new Date('2026-08-16T10:00:00.000Z');
    expect(todayHoursLine(weekday, 'UTC', sun)).toBe('Sunday · Closed — no online ordering.');
  });
});

describe('overviewHeroHeading', () => {
  it('uses the current interval close while open', () => {
    const tue = new Date('2026-08-11T10:00:00.000Z');
    expect(overviewHeroHeading(weekday, 'UTC', tue)).toEqual({
      heading: 'Taking orders until 16:00',
      isOpen: true,
    });
  });

  it('points at the next interval during a split-shift gap', () => {
    const wedGap = new Date('2026-08-12T12:00:00.000Z');
    expect(overviewHeroHeading(weekday, 'UTC', wedGap)).toEqual({
      heading: 'Closed · opens 12:30',
      isOpen: false,
    });
  });

  it('is closed on Sunday', () => {
    const sun = new Date('2026-08-16T10:00:00.000Z');
    expect(overviewHeroHeading(weekday, 'UTC', sun)).toEqual({
      heading: 'Closed',
      isOpen: false,
    });
  });
});
