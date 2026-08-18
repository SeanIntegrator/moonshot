/**
 * Open / accepting-orders derived from weekly hours, date overrides, pause,
 * and last-order buffer. Weekly parse helpers live in cafe-hours.ts.
 */

import type {
  CafeHours,
  CafeHoursInterval,
  CafeHoursOverride,
  CafeOpenStatus,
  CafeOpenStatusExtras,
  LastOrderBufferMinutes,
} from '@moonshot/types';
import {
  DEFAULT_LAST_ORDER_BUFFER_MINUTES,
  LAST_ORDER_BUFFER_MINUTES,
} from '@moonshot/types';
import {
  addCalendarDays,
  cafeHoursConfigured,
  calendarDateToIso,
  emptyCafeHours,
  findIntervalContaining,
  formatCaptionTime,
  formatTime24FromInstant,
  hhMmToMinutes,
  localCalendarDate,
  localParts,
  minutesToHhMm,
  normalizeCafeHours,
  normalizeCafeHoursIntervals,
  weekdayKeyFromIsoDate,
  zonedWallClockToUtc,
} from './cafe-hours.js';

export {
  DEFAULT_LAST_ORDER_BUFFER_MINUTES,
  LAST_ORDER_BUFFER_MINUTES,
};

const NEXT_OPEN_SEARCH_DAYS = 14;

export function isLastOrderBufferMinutes(value: unknown): value is LastOrderBufferMinutes {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    (LAST_ORDER_BUFFER_MINUTES as readonly number[]).includes(value)
  );
}

export function normalizeCafeHoursOverrides(raw: unknown): CafeHoursOverride[] {
  if (!Array.isArray(raw)) return [];
  const out: CafeHoursOverride[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const rec = item as Record<string, unknown>;
    const date = typeof rec.date === 'string' ? rec.date : '';
    if (!weekdayKeyFromIsoDate(date)) continue;
    const closed = rec.closed === true;
    const intervals = closed ? [] : normalizeCafeHoursIntervals(rec.intervals);
    if (!closed && intervals.length === 0) continue;
    const label =
      typeof rec.label === 'string' && rec.label.trim().length > 0 ? rec.label.trim() : null;
    out.push({ date, label, closed, intervals });
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

export function effectiveIntervalsForDate(
  hours: CafeHours,
  overrides: CafeHoursOverride[] | undefined,
  isoDate: string,
): CafeHoursInterval[] {
  const hit = overrides?.find((o) => o.date === isoDate);
  if (hit) return hit.closed ? [] : hit.intervals;
  const weekday = weekdayKeyFromIsoDate(isoDate);
  if (!weekday) return [];
  return hours[weekday];
}

export function lastOrderMinutesForInterval(
  interval: CafeHoursInterval,
  bufferMinutes: number,
): number | null {
  const open = hhMmToMinutes(interval.open);
  const close = hhMmToMinutes(interval.close);
  if (open == null || close == null) return null;
  const buffer = Number.isFinite(bufferMinutes) ? Math.max(0, Math.floor(bufferMinutes)) : 0;
  return Math.max(open, close - buffer);
}

export function lastOrderSlotHhMm(
  interval: CafeHoursInterval,
  bufferMinutes: number,
): string | null {
  const mins = lastOrderMinutesForInterval(interval, bufferMinutes);
  if (mins == null) return null;
  return minutesToHhMm(mins);
}

function closedStatus(caption: string): CafeOpenStatus {
  return { isOpen: false, caption, reason: 'closed' };
}

function parsePausedUntil(value: Date | string | null | undefined): Date | null {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function nextOpenAfter(
  hours: CafeHours,
  overrides: CafeHoursOverride[] | undefined,
  cal: { year: number; month: number; day: number },
  minutes: number,
): { open: string; target: { year: number; month: number; day: number } } | null {
  for (let offset = 0; offset < NEXT_OPEN_SEARCH_DAYS; offset++) {
    const target = addCalendarDays(cal.year, cal.month, cal.day, offset);
    const iso = calendarDateToIso(target);
    const intervals = effectiveIntervalsForDate(hours, overrides, iso);
    for (const iv of intervals) {
      const o = hhMmToMinutes(iv.open);
      if (o == null) continue;
      if (offset === 0 && o <= minutes) continue;
      return { open: iv.open, target };
    }
  }
  return null;
}

/**
 * Instant of the next café opening after `now`.
 * When currently inside an hours interval, this is the opening *after* that
 * interval ends (so "Out today" mid-service returns at tomorrow's open, not a later split).
 * Unconfigured hours → null. Date overrides replace the weekday for that calendar day.
 */
export function nextCafeOpenAt(
  hoursInput: CafeHours | null | undefined,
  timezone: string,
  now: Date = new Date(),
  extras: Pick<CafeOpenStatusExtras, 'overrides'> = {},
): Date | null {
  const hours = hoursInput ? normalizeCafeHours(hoursInput) : emptyCafeHours();
  const overrides = extras.overrides;
  if (!cafeHoursConfigured(hours) && !(overrides && overrides.length > 0)) return null;
  const tz = timezone || 'UTC';
  const local = localParts(tz, now);
  if (!local) return null;
  const cal = localCalendarDate(tz, now);
  if (!cal) return null;

  const todayIso = calendarDateToIso(cal);
  const todayIntervals = effectiveIntervalsForDate(hours, overrides, todayIso);
  const openNow = findIntervalContaining(todayIntervals, local.minutes);
  const searchMinutes = openNow ? (hhMmToMinutes(openNow.close) ?? local.minutes) : local.minutes;
  const next = nextOpenAfter(hours, overrides, cal, searchMinutes);
  if (!next) return null;
  const openMins = hhMmToMinutes(next.open);
  if (openMins == null) return null;
  return zonedWallClockToUtc(
    tz,
    next.target.year,
    next.target.month,
    next.target.day,
    Math.floor(openMins / 60),
    openMins % 60,
  );
}

/**
 * Compute accepting-orders for `now` in the café timezone.
 * Unconfigured / empty hours → closed (safe launch default).
 */
export function cafeOpenStatus(
  hoursInput: CafeHours | null | undefined,
  timezone: string,
  now: Date = new Date(),
  extras: CafeOpenStatusExtras = {},
): CafeOpenStatus {
  const pausedUntil = parsePausedUntil(extras.pausedUntil);
  if (pausedUntil && pausedUntil.getTime() > now.getTime()) {
    const until = formatTime24FromInstant(pausedUntil, timezone || 'UTC');
    return {
      isOpen: false,
      caption: until
        ? `Taking a short break — back at ${until}`
        : 'Taking a short break — back shortly',
      reason: 'paused',
    };
  }

  const hours = hoursInput ? normalizeCafeHours(hoursInput) : emptyCafeHours();
  const overrides = extras.overrides;
  if (!cafeHoursConfigured(hours) && !(overrides && overrides.length > 0)) {
    return closedStatus('Closed');
  }

  const tz = timezone || 'UTC';
  const local = localParts(tz, now);
  if (!local) return closedStatus('Closed');
  const cal = localCalendarDate(tz, now);
  if (!cal) return closedStatus('Closed');

  const buffer =
    extras.lastOrderBufferMinutes != null && Number.isFinite(extras.lastOrderBufferMinutes)
      ? Math.max(0, Math.floor(extras.lastOrderBufferMinutes))
      : DEFAULT_LAST_ORDER_BUFFER_MINUTES;

  const todayIso = calendarDateToIso(cal);
  const todayIntervals = effectiveIntervalsForDate(hours, overrides, todayIso);
  const openNow = findIntervalContaining(todayIntervals, local.minutes);

  if (openNow) {
    const lastMins = lastOrderMinutesForInterval(openNow, buffer);
    if (lastMins != null && local.minutes >= lastMins) {
      const next = nextOpenAfter(hours, overrides, cal, hhMmToMinutes(openNow.close) ?? local.minutes);
      return {
        isOpen: false,
        caption: next ? `Closed · opens ${formatCaptionTime(next.open)}` : 'Closed',
        reason: 'buffer',
      };
    }
    return {
      isOpen: true,
      caption: `Open · closes ${formatCaptionTime(openNow.close)}`,
      reason: 'open',
    };
  }

  const next = nextOpenAfter(hours, overrides, cal, local.minutes);
  if (!next) return closedStatus('Closed');
  return closedStatus(`Closed · opens ${formatCaptionTime(next.open)}`);
}

/** True when `now + delayMinutes` still falls before that day's last-order slot. */
export function pickupDelayFitsLastSlot(params: {
  delayMinutes: number;
  now: Date;
  timezone: string;
  hours: CafeHours | null | undefined;
  overrides?: CafeHoursOverride[];
  lastOrderBufferMinutes?: number;
}): boolean {
  const delay = params.delayMinutes;
  if (!Number.isInteger(delay) || delay < 0) return false;
  const pickupAt = new Date(params.now.getTime() + delay * 60_000);
  const hours = params.hours ? normalizeCafeHours(params.hours) : emptyCafeHours();
  const tz = params.timezone || 'UTC';
  const local = localParts(tz, pickupAt);
  const cal = localCalendarDate(tz, pickupAt);
  if (!local || !cal) return false;
  const iso = calendarDateToIso(cal);
  const intervals = effectiveIntervalsForDate(hours, params.overrides, iso);
  const interval = findIntervalContaining(intervals, local.minutes);
  if (!interval) return false;
  const buffer =
    params.lastOrderBufferMinutes != null && Number.isFinite(params.lastOrderBufferMinutes)
      ? Math.max(0, Math.floor(params.lastOrderBufferMinutes))
      : DEFAULT_LAST_ORDER_BUFFER_MINUTES;
  const lastMins = lastOrderMinutesForInterval(interval, buffer);
  if (lastMins == null) return false;
  return local.minutes < lastMins;
}

export function cafeOpenStatusForCafe(
  cafe: {
    hours?: CafeHours | null;
    timezone: string;
    pausedUntil?: Date | string | null;
    hoursOverrides?: CafeHoursOverride[];
    lastOrderBufferMinutes?: number;
  },
  now?: Date,
): CafeOpenStatus {
  return cafeOpenStatus(cafe.hours, cafe.timezone, now, {
    pausedUntil: cafe.pausedUntil,
    overrides: cafe.hoursOverrides,
    lastOrderBufferMinutes: cafe.lastOrderBufferMinutes,
  });
}

export function currentLastOrderSlotHhMm(params: {
  hours: CafeHours | null | undefined;
  timezone: string;
  now?: Date;
  overrides?: CafeHoursOverride[];
  lastOrderBufferMinutes?: number;
}): string | null {
  const now = params.now ?? new Date();
  const hours = params.hours ? normalizeCafeHours(params.hours) : emptyCafeHours();
  const tz = params.timezone || 'UTC';
  const local = localParts(tz, now);
  const cal = localCalendarDate(tz, now);
  if (!local || !cal) return null;
  const iso = calendarDateToIso(cal);
  const intervals = effectiveIntervalsForDate(hours, params.overrides, iso);
  const interval = findIntervalContaining(intervals, local.minutes);
  if (!interval) return null;
  const buffer =
    params.lastOrderBufferMinutes != null && Number.isFinite(params.lastOrderBufferMinutes)
      ? Math.max(0, Math.floor(params.lastOrderBufferMinutes))
      : DEFAULT_LAST_ORDER_BUFFER_MINUTES;
  return lastOrderSlotHhMm(interval, buffer);
}
