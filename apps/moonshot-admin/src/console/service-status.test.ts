import { describe, expect, it } from 'vitest';
import { resolveServiceStatus } from './service-status.js';

const TZ = 'Europe/London';

describe('resolveServiceStatus', () => {
  it('is taking orders when open and not paused', () => {
    expect(
      resolveServiceStatus({ isOpen: true, timeZone: TZ }),
    ).toEqual({ kind: 'taking_orders', label: 'Taking orders' });
  });

  it('is closed when hours say closed', () => {
    expect(
      resolveServiceStatus({ isOpen: false, timeZone: TZ }),
    ).toEqual({ kind: 'closed', label: 'Closed' });
  });

  it('pause wins over open hours until the timestamp', () => {
    const now = new Date('2026-08-12T12:00:00.000Z');
    const pausedUntil = '2026-08-12T14:10:00.000Z';
    const status = resolveServiceStatus({
      isOpen: true,
      timeZone: 'UTC',
      pausedUntil,
      now,
    });
    expect(status.kind).toBe('paused');
    expect(status.label).toBe('Paused until 14:10');
  });

  it('expired pause falls through to hours', () => {
    const now = new Date('2026-08-12T15:00:00.000Z');
    expect(
      resolveServiceStatus({
        isOpen: true,
        timeZone: 'UTC',
        pausedUntil: '2026-08-12T14:10:00.000Z',
        now,
      }),
    ).toEqual({ kind: 'taking_orders', label: 'Taking orders' });
  });
});
