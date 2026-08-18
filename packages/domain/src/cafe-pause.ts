/**
 * Resolve admin pause durations to an absolute instant in the café timezone.
 * `rest_of_today` is local midnight at the start of tomorrow (covers later split shifts).
 */

import type { PauseDuration } from '@moonshot/types';
import { PAUSE_DURATION_VALUES } from '@moonshot/types';
import { addCalendarDays, localCalendarDate, zonedWallClockToUtc } from './cafe-hours.js';

const DURATION_MINUTES: Record<Exclude<PauseDuration, 'rest_of_today'>, number> = {
  '15m': 15,
  '30m': 30,
  '1h': 60,
};

export function isPauseDuration(value: unknown): value is PauseDuration {
  return typeof value === 'string' && (PAUSE_DURATION_VALUES as readonly string[]).includes(value);
}

export function resolvePauseUntil(params: {
  duration: PauseDuration;
  timezone: string;
  now?: Date;
}): Date {
  const now = params.now ?? new Date();
  if (params.duration !== 'rest_of_today') {
    return new Date(now.getTime() + DURATION_MINUTES[params.duration] * 60_000);
  }
  const tz = params.timezone || 'UTC';
  const cal = localCalendarDate(tz, now);
  if (!cal) return new Date(now.getTime() + 24 * 60 * 60_000);
  const tomorrow = addCalendarDays(cal.year, cal.month, cal.day, 1);
  return (
    zonedWallClockToUtc(tz, tomorrow.year, tomorrow.month, tomorrow.day, 0, 0) ??
    new Date(now.getTime() + 24 * 60 * 60_000)
  );
}

export function extendPauseUntil(params: {
  pausedUntil: Date | string | null | undefined;
  minutes: number;
  now?: Date;
}): Date {
  const now = params.now ?? new Date();
  const minutes = Number.isFinite(params.minutes) ? Math.max(0, Math.floor(params.minutes)) : 0;
  let base = now;
  if (params.pausedUntil) {
    const until = params.pausedUntil instanceof Date ? params.pausedUntil : new Date(params.pausedUntil);
    if (!Number.isNaN(until.getTime()) && until.getTime() > now.getTime()) {
      base = until;
    }
  }
  return new Date(base.getTime() + minutes * 60_000);
}
