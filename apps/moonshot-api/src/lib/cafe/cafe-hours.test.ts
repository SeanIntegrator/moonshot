import { describe, expect, it } from 'vitest';
import { cafeOpenStatus, defaultWeekdayCafeHours, emptyCafeHours, nextCafeOpenAt, normalizeCafeHours } from '@moonshot/domain';

describe('cafeOpenStatus', () => {
  it('treats empty hours as closed', () => {
    expect(cafeOpenStatus(emptyCafeHours(), 'Europe/London').isOpen).toBe(false);
    expect(cafeOpenStatus(null, 'Europe/London').caption).toBe('Closed');
  });

  it('reports open during a weekday interval', () => {
    const hours = defaultWeekdayCafeHours();
    // 2026-07-21 is a Tuesday; 10:00 UTC = 11:00 BST in London
    const now = new Date('2026-07-21T10:00:00.000Z');
    const status = cafeOpenStatus(hours, 'Europe/London', now);
    expect(status.isOpen).toBe(true);
    expect(status.caption).toMatch(/Open/);
  });

  it('reports closed outside hours with next open hint', () => {
    const hours = defaultWeekdayCafeHours();
    // Tuesday 20:00 UTC = 21:00 BST — after 16:00 close
    const now = new Date('2026-07-21T20:00:00.000Z');
    const status = cafeOpenStatus(hours, 'Europe/London', now);
    expect(status.isOpen).toBe(false);
    expect(status.caption).toMatch(/Closed · opens/);
  });

  it('returns tomorrow morning when currently open', () => {
    const hours = defaultWeekdayCafeHours();
    // Tuesday 10:00 UTC = 11:00 BST — inside 08:00–16:00
    const now = new Date('2026-07-21T10:00:00.000Z');
    const next = nextCafeOpenAt(hours, 'Europe/London', now);
    expect(next?.toISOString()).toBe('2026-07-22T07:00:00.000Z');
  });

  it('returns tomorrow morning when already closed', () => {
    const hours = defaultWeekdayCafeHours();
    const now = new Date('2026-07-21T20:00:00.000Z');
    const next = nextCafeOpenAt(hours, 'Europe/London', now);
    expect(next?.toISOString()).toBe('2026-07-22T07:00:00.000Z');
  });

  it('returns null when hours are empty', () => {
    expect(nextCafeOpenAt(emptyCafeHours(), 'Europe/London')).toBeNull();
  });

  it('normalises junk intervals away', () => {
    const hours = normalizeCafeHours({
      mon: [{ open: '09:00', close: '08:00' }, { open: 'bad', close: '10:00' }, { open: '09:00', close: '17:00' }],
      tue: 'nope',
    });
    expect(hours.mon).toEqual([{ open: '09:00', close: '17:00' }]);
    expect(hours.tue).toEqual([]);
  });
});
