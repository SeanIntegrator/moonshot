/**
 * Weekly opening hours for a café (local wall-clock in the café's timezone).
 * Empty day arrays mean closed that day. Missing/empty hours overall → closed.
 */

export type WeekdayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export const WEEKDAY_KEYS: readonly WeekdayKey[] = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
] as const;

export interface CafeHoursInterval {
  /** Local wall-clock `HH:mm` (24h). */
  open: string;
  /** Local wall-clock `HH:mm` (24h). Must be after `open` (same-day only). */
  close: string;
}

export type CafeHours = Record<WeekdayKey, CafeHoursInterval[]>;

export interface CafeOpenStatus {
  isOpen: boolean;
  /** Short Home caption, e.g. `Open · closes 4:00 pm` / `Closed · opens 8:00 am`. */
  caption: string;
}

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
