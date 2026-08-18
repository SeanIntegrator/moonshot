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

  it('uses a date override in place of the weekday', () => {
    const tue = new Date('2026-08-11T10:00:00.000Z');
    expect(
      todayHoursLine(weekday, 'UTC', tue, [
        { date: '2026-08-11', label: 'bank holiday', closed: true, intervals: [] },
      ]),
    ).toBe('Tuesday · Closed — bank holiday.');
  });
});

describe('overviewHeroHeading', () => {
  it('uses the current interval close while open', () => {
    const tue = new Date('2026-08-11T10:00:00.000Z');
    expect(overviewHeroHeading(weekday, 'UTC', tue)).toEqual({
      heading: 'Taking orders until 16:00',
      isOpen: true,
      sub: 'Last order-ahead slot is 15:40.',
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

  it('shows pause copy while pausedUntil is in the future', () => {
    const tue = new Date('2026-08-11T10:00:00.000Z');
    expect(
      overviewHeroHeading(weekday, 'UTC', tue, { pausedUntil: '2026-08-11T12:15:00.000Z' }),
    ).toEqual({
      heading: 'Orders paused until 12:15',
      isOpen: false,
      sub: "Customers see 'back shortly'. Your hours are unchanged.",
    });
  });

  it('is closed after the last-order slot while weekly hours are still open', () => {
    const afterSlot = new Date('2026-08-11T15:50:00.000Z');
    expect(
      overviewHeroHeading(weekday, 'UTC', afterSlot, { lastOrderBufferMinutes: 20 }),
    ).toEqual({
      heading: 'Closed',
      isOpen: false,
    });
  });

  it('points at the next split after a morning last-order slot', () => {
    const wedBuffer = new Date('2026-08-12T11:20:00.000Z');
    expect(
      overviewHeroHeading(weekday, 'UTC', wedBuffer, { lastOrderBufferMinutes: 20 }),
    ).toEqual({
      heading: 'Closed · opens 12:30',
      isOpen: false,
    });
  });
});
