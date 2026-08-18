import { describe, expect, it } from 'vitest';
import { extendPauseUntil, resolvePauseUntil } from '@moonshot/domain';

describe('resolvePauseUntil', () => {
  it('adds 15 minutes', () => {
    const now = new Date('2026-08-11T12:00:00.000Z');
    expect(resolvePauseUntil({ duration: '15m', timezone: 'UTC', now }).toISOString()).toBe(
      '2026-08-11T12:15:00.000Z',
    );
  });

  it('rest of today is local midnight tomorrow', () => {
    const now = new Date('2026-08-11T15:00:00.000Z');
    // 16:00 BST 11 Aug → start of 12 Aug BST = 11 Aug 23:00 UTC
    expect(
      resolvePauseUntil({ duration: 'rest_of_today', timezone: 'Europe/London', now }).toISOString(),
    ).toBe('2026-08-11T23:00:00.000Z');
  });

  it('rest of today uses BST after the spring-forward Sunday', () => {
    // 29 Mar 2026 13:00 BST (clocks went forward at 01:00 GMT) → start of 30 Mar BST
    const now = new Date('2026-03-29T12:00:00.000Z');
    expect(
      resolvePauseUntil({ duration: 'rest_of_today', timezone: 'Europe/London', now }).toISOString(),
    ).toBe('2026-03-29T23:00:00.000Z');
  });
});

describe('extendPauseUntil', () => {
  it('extends an active pause', () => {
    const now = new Date('2026-08-11T12:00:00.000Z');
    expect(
      extendPauseUntil({
        pausedUntil: '2026-08-11T12:10:00.000Z',
        minutes: 15,
        now,
      }).toISOString(),
    ).toBe('2026-08-11T12:25:00.000Z');
  });

  it('starts from now when the pause has expired', () => {
    const now = new Date('2026-08-11T12:00:00.000Z');
    expect(
      extendPauseUntil({
        pausedUntil: '2026-08-11T11:00:00.000Z',
        minutes: 15,
        now,
      }).toISOString(),
    ).toBe('2026-08-11T12:15:00.000Z');
  });
});
