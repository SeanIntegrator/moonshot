/**
 * Weekly opening hours for a café (local wall-clock in the café's timezone).
 * Empty day arrays mean closed that day. Missing/empty hours overall → closed.
 *
 * Shape contracts live in `@moonshot/types`; runtime helpers live here.
 */

import {
  WEEKDAY_KEYS,
  type CafeHours,
  type CafeHoursInterval,
  type CafeOpenStatus,
  type WeekdayKey,
} from '@moonshot/types';

export type { CafeHours, CafeHoursInterval, CafeOpenStatus, WeekdayKey };
export { WEEKDAY_KEYS };

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

const WEEKDAY_FROM_SHORT: Record<string, WeekdayKey> = {
  mon: 'mon',
  tue: 'tue',
  wed: 'wed',
  thu: 'thu',
  fri: 'fri',
  sat: 'sat',
  sun: 'sun',
};

export function emptyCafeHours(): CafeHours {
  return { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
}

/** Sensible weekday template for new / seeded cafés (08:00–16:00, closed Sunday). */
export function defaultWeekdayCafeHours(): CafeHours {
  const day: CafeHoursInterval[] = [{ open: '08:00', close: '16:00' }];
  return {
    mon: [...day],
    tue: [...day],
    wed: [...day],
    thu: [...day],
    fri: [...day],
    sat: [...day],
    sun: [],
  };
}

export function isValidHhMm(value: string): boolean {
  return HH_MM.test(value);
}

/** Normalise wire/browser time strings to `HH:mm`. */
export function toHhMm(value: string): string | null {
  const m = HH_MM.exec(value);
  if (!m) return null;
  return `${m[1]}:${m[2]}`;
}

/** Minutes since local midnight; null if not `HH:mm` / `HH:mm:ss`. */
export function hhMmToMinutes(value: string): number | null {
  const m = HH_MM.exec(value);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function normalizeCafeHours(raw: unknown): CafeHours {
  const out = emptyCafeHours();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const rec = raw as Record<string, unknown>;
  for (const day of WEEKDAY_KEYS) {
    const intervals = rec[day];
    if (!Array.isArray(intervals)) continue;
    const cleaned: CafeHoursInterval[] = [];
    for (const item of intervals) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
      const openRaw =
        typeof (item as { open?: unknown }).open === 'string' ? (item as { open: string }).open : '';
      const closeRaw =
        typeof (item as { close?: unknown }).close === 'string' ? (item as { close: string }).close : '';
      const open = toHhMm(openRaw);
      const close = toHhMm(closeRaw);
      if (!open || !close) continue;
      const o = hhMmToMinutes(open)!;
      const c = hhMmToMinutes(close)!;
      if (o >= c) continue;
      cleaned.push({ open, close });
    }
    out[day] = cleaned;
  }
  return out;
}

/**
 * True when two windows on the same day share any open time.
 * Adjacent windows that only touch (11:30–12:30 and 12:30–16:00) do not overlap.
 */
export function cafeHoursIntervalsOverlap(intervals: CafeHoursInterval[]): boolean {
  const parsed: Array<{ open: number; close: number }> = [];
  for (const iv of intervals) {
    const open = hhMmToMinutes(toHhMm(iv.open) ?? iv.open);
    const close = hhMmToMinutes(toHhMm(iv.close) ?? iv.close);
    if (open == null || close == null) continue;
    parsed.push({ open, close });
  }
  parsed.sort((a, b) => a.open - b.open);
  for (let i = 1; i < parsed.length; i++) {
    if (parsed[i]!.open < parsed[i - 1]!.close) return true;
  }
  return false;
}

/** True when at least one day has an interval (café has configured hours). */
export function cafeHoursConfigured(hours: CafeHours): boolean {
  return WEEKDAY_KEYS.some((d) => hours[d].length > 0);
}

function localParts(
  timezone: string,
  now: Date,
): { weekday: WeekdayKey; minutes: number } | null {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const weekdayRaw = parts.find((p) => p.type === 'weekday')?.value?.slice(0, 3).toLowerCase();
    const hour = parts.find((p) => p.type === 'hour')?.value;
    const minute = parts.find((p) => p.type === 'minute')?.value;
    if (!weekdayRaw || hour == null || minute == null) return null;
    const weekday = WEEKDAY_FROM_SHORT[weekdayRaw];
    if (!weekday) return null;
    // en-GB can yield "24" for midnight in some engines — normalise.
    const h = hour === '24' ? 0 : Number(hour);
    const min = Number(minute);
    if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
    return { weekday, minutes: h * 60 + min };
  } catch {
    return null;
  }
}

function formatCaptionTime(hhMm: string): string {
  const mins = hhMmToMinutes(hhMm);
  if (mins == null) return hhMm;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const period = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}:00 ${period}` : `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function findOpenInterval(
  hours: CafeHours,
  weekday: WeekdayKey,
  minutes: number,
): CafeHoursInterval | null {
  for (const iv of hours[weekday]) {
    const o = hhMmToMinutes(iv.open)!;
    const c = hhMmToMinutes(iv.close)!;
    if (minutes >= o && minutes < c) return iv;
  }
  return null;
}

function nextOpenAfter(
  hours: CafeHours,
  weekday: WeekdayKey,
  minutes: number,
): { dayOffset: number; open: string } | null {
  for (let offset = 0; offset < 7; offset++) {
    const dayIndex = (WEEKDAY_KEYS.indexOf(weekday) + offset) % 7;
    const day = WEEKDAY_KEYS[dayIndex]!;
    for (const iv of hours[day]) {
      const o = hhMmToMinutes(iv.open)!;
      if (offset === 0 && o <= minutes) continue;
      return { dayOffset: offset, open: iv.open };
    }
  }
  return null;
}

function localCalendarDate(
  timezone: string,
  now: Date,
): { year: number; month: number; day: number } | null {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(now);
    const year = Number(parts.find((p) => p.type === 'year')?.value);
    const month = Number(parts.find((p) => p.type === 'month')?.value);
    const day = Number(parts.find((p) => p.type === 'day')?.value);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    return { year, month, day };
  } catch {
    return null;
  }
}

function addCalendarDays(
  year: number,
  month: number,
  day: number,
  offset: number,
): { year: number; month: number; day: number } {
  const utc = new Date(Date.UTC(year, month - 1, day + offset));
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
}

/** Convert a wall-clock local datetime in `timeZone` to a UTC instant. */
function zonedWallClockToUtc(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date | null {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const asLocal = localCalendarDate(timeZone, new Date(utcGuess));
  const parts = localParts(timeZone, new Date(utcGuess));
  if (!asLocal || !parts) return null;
  const asLocalUtc = Date.UTC(
    asLocal.year,
    asLocal.month - 1,
    asLocal.day,
    Math.floor(parts.minutes / 60),
    parts.minutes % 60,
    0,
  );
  const instant = new Date(utcGuess - (asLocalUtc - utcGuess));
  // Second pass in case DST shifted the offset between the guess and the result.
  const asLocal2 = localCalendarDate(timeZone, instant);
  const parts2 = localParts(timeZone, instant);
  if (!asLocal2 || !parts2) return instant;
  const asLocalUtc2 = Date.UTC(
    asLocal2.year,
    asLocal2.month - 1,
    asLocal2.day,
    Math.floor(parts2.minutes / 60),
    parts2.minutes % 60,
    0,
  );
  const wantedUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  return new Date(instant.getTime() + (wantedUtc - asLocalUtc2));
}

/**
 * Instant of the next café opening after `now`.
 * When currently open, this is the opening *after* the current interval ends
 * (so "Out today" mid-service returns at tomorrow's open, not a later split).
 * Unconfigured hours → null.
 */
export function nextCafeOpenAt(
  hoursInput: CafeHours | null | undefined,
  timezone: string,
  now: Date = new Date(),
): Date | null {
  const hours = hoursInput ? normalizeCafeHours(hoursInput) : emptyCafeHours();
  if (!cafeHoursConfigured(hours)) return null;
  const tz = timezone || 'UTC';
  const local = localParts(tz, now);
  if (!local) return null;

  const openNow = findOpenInterval(hours, local.weekday, local.minutes);
  const searchMinutes = openNow ? hhMmToMinutes(openNow.close)! : local.minutes;
  const next = nextOpenAfter(hours, local.weekday, searchMinutes);
  if (!next) return null;

  const cal = localCalendarDate(tz, now);
  if (!cal) return null;
  const openMins = hhMmToMinutes(next.open);
  if (openMins == null) return null;
  const target = addCalendarDays(cal.year, cal.month, cal.day, next.dayOffset);
  return zonedWallClockToUtc(
    tz,
    target.year,
    target.month,
    target.day,
    Math.floor(openMins / 60),
    openMins % 60,
  );
}

/**
 * Compute open/closed for `now` in the café timezone.
 * Unconfigured / empty hours → closed (safe launch default).
 */
export function cafeOpenStatus(
  hoursInput: CafeHours | null | undefined,
  timezone: string,
  now: Date = new Date(),
): CafeOpenStatus {
  const hours = hoursInput ? normalizeCafeHours(hoursInput) : emptyCafeHours();
  if (!cafeHoursConfigured(hours)) {
    return { isOpen: false, caption: 'Closed' };
  }

  const local = localParts(timezone || 'UTC', now);
  if (!local) {
    return { isOpen: false, caption: 'Closed' };
  }

  const openNow = findOpenInterval(hours, local.weekday, local.minutes);
  if (openNow) {
    return {
      isOpen: true,
      caption: `Open · closes ${formatCaptionTime(openNow.close)}`,
    };
  }

  const next = nextOpenAfter(hours, local.weekday, local.minutes);
  if (!next) {
    return { isOpen: false, caption: 'Closed' };
  }
  return {
    isOpen: false,
    caption: `Closed · opens ${formatCaptionTime(next.open)}`,
  };
}
