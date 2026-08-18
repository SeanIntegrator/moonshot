import { describe, expect, it } from 'vitest';
import {
  cafeOpenStatus,
  defaultWeekdayCafeHours,
  emptyCafeHours,
  nextCafeOpenAt,
  normalizeCafeHours,
  pickupDelayFitsLastSlot,
} from '@moonshot/domain';
import type { CafeHours } from '@moonshot/types';

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
    expect(status.reason).toBe('closed');
  });

  it('treats pause as closed with a different caption', () => {
    const hours = defaultWeekdayCafeHours();
    const now = new Date('2026-07-21T10:00:00.000Z');
    const status = cafeOpenStatus(hours, 'Europe/London', now, {
      pausedUntil: '2026-07-21T12:10:00.000Z',
    });
    expect(status.isOpen).toBe(false);
    expect(status.reason).toBe('paused');
    expect(status.caption).toMatch(/back at/);
  });

  it('stops taking orders inside the last-order buffer', () => {
    const hours = defaultWeekdayCafeHours();
    // 15:45 BST Tuesday — inside 08:00–16:00 but after 15:40 last slot
    const now = new Date('2026-07-21T14:45:00.000Z');
    const status = cafeOpenStatus(hours, 'Europe/London', now, { lastOrderBufferMinutes: 20 });
    expect(status.isOpen).toBe(false);
    expect(status.reason).toBe('buffer');
  });

  it('uses a closed date override instead of the weekday template', () => {
    const hours = defaultWeekdayCafeHours();
    const now = new Date('2026-07-21T10:00:00.000Z');
    const status = cafeOpenStatus(hours, 'Europe/London', now, {
      lastOrderBufferMinutes: 0,
      overrides: [{ date: '2026-07-21', label: 'bank holiday', closed: true, intervals: [] }],
    });
    expect(status.isOpen).toBe(false);
    expect(status.reason).toBe('closed');
  });

  it('applies the last-order buffer to the current split-shift interval', () => {
    const hours: CafeHours = {
      ...defaultWeekdayCafeHours(),
      tue: [
        { open: '08:00', close: '12:00' },
        { open: '14:00', close: '18:00' },
      ],
    };
    const morningBuffer = cafeOpenStatus(hours, 'Europe/London', new Date('2026-07-21T10:50:00.000Z'), {
      lastOrderBufferMinutes: 20,
    });
    expect(morningBuffer.isOpen).toBe(false);
    expect(morningBuffer.reason).toBe('buffer');

    const afternoonOpen = cafeOpenStatus(hours, 'Europe/London', new Date('2026-07-21T13:10:00.000Z'), {
      lastOrderBufferMinutes: 20,
    });
    expect(afternoonOpen.isOpen).toBe(true);
    expect(afternoonOpen.reason).toBe('open');
  });

  it('opens on custom override hours', () => {
    const hours = defaultWeekdayCafeHours();
    const now = new Date('2026-07-25T06:30:00.000Z'); // Saturday 07:30 BST
    const status = cafeOpenStatus(hours, 'Europe/London', now, {
      lastOrderBufferMinutes: 0,
      overrides: [
        {
          date: '2026-07-25',
          label: 'street market',
          closed: false,
          intervals: [{ open: '07:00', close: '17:00' }],
        },
      ],
    });
    expect(status.isOpen).toBe(true);
    expect(status.reason).toBe('open');
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

  it('skips a closed override day', () => {
    const hours = defaultWeekdayCafeHours();
    const now = new Date('2026-07-21T20:00:00.000Z');
    const next = nextCafeOpenAt(hours, 'Europe/London', now, {
      overrides: [{ date: '2026-07-22', label: 'bank holiday', closed: true, intervals: [] }],
    });
    expect(next?.toISOString()).toBe('2026-07-23T07:00:00.000Z');
  });

  it('rejects a pickup delay after the last slot', () => {
    const hours = defaultWeekdayCafeHours();
    const now = new Date('2026-07-21T13:00:00.000Z'); // 14:00 BST
    expect(
      pickupDelayFitsLastSlot({
        delayMinutes: 90,
        now,
        timezone: 'Europe/London',
        hours,
        lastOrderBufferMinutes: 20,
      }),
    ).toBe(true);
    expect(
      pickupDelayFitsLastSlot({
        delayMinutes: 120,
        now,
        timezone: 'Europe/London',
        hours,
        lastOrderBufferMinutes: 20,
      }),
    ).toBe(false);
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
