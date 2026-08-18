import { normalizeCafeHours, type CafeHours, type WeekdayKey } from '@moonshot/domain';

const WEEKDAY_LONG: Record<WeekdayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

const WEEKDAY_FROM_SHORT: Record<string, WeekdayKey> = {
  mon: 'mon',
  tue: 'tue',
  wed: 'wed',
  thu: 'thu',
  fri: 'fri',
  sat: 'sat',
  sun: 'sun',
};

export function localWeekdayKey(timezone: string, now: Date): WeekdayKey | null {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      weekday: 'short',
    }).formatToParts(now);
    const raw = parts.find((p) => p.type === 'weekday')?.value?.slice(0, 3).toLowerCase();
    return raw ? (WEEKDAY_FROM_SHORT[raw] ?? null) : null;
  } catch {
    return null;
  }
}

function localMinutes(timezone: string, now: Date): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(now);
    const hourRaw = parts.find((p) => p.type === 'hour')?.value;
    const minute = parts.find((p) => p.type === 'minute')?.value;
    if (hourRaw == null || minute == null) return null;
    const h = hourRaw === '24' ? 0 : Number(hourRaw);
    const min = Number(minute);
    if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
    return h * 60 + min;
  } catch {
    return null;
  }
}

function hhMmToMinutes(value: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function formatIntervals(intervals: { open: string; close: string }[]): string {
  return intervals.map((iv) => `${iv.open} – ${iv.close}`).join(' and ');
}

/** `Tuesday · 08:00 – 16:00` or closed copy. */
export function todayHoursLine(hoursInput: CafeHours, timezone: string, now: Date = new Date()): string {
  const hours = normalizeCafeHours(hoursInput);
  const day = localWeekdayKey(timezone, now);
  if (!day) return 'Hours unavailable';
  const intervals = hours[day];
  const name = WEEKDAY_LONG[day];
  if (intervals.length === 0) return `${name} · Closed — no online ordering.`;
  return `${name} · ${formatIntervals(intervals)}`;
}

export function overviewHeroHeading(
  hoursInput: CafeHours,
  timezone: string,
  now: Date = new Date(),
): { heading: string; isOpen: boolean } {
  const hours = normalizeCafeHours(hoursInput);
  const day = localWeekdayKey(timezone, now);
  const minutes = localMinutes(timezone, now);
  if (!day || minutes == null) {
    return { heading: 'Closed', isOpen: false };
  }
  const intervals = hours[day];
  for (const iv of intervals) {
    const open = hhMmToMinutes(iv.open);
    const close = hhMmToMinutes(iv.close);
    if (open == null || close == null) continue;
    if (minutes >= open && minutes < close) {
      return { heading: `Taking orders until ${iv.close}`, isOpen: true };
    }
  }
  const later = intervals.find((iv) => {
    const open = hhMmToMinutes(iv.open);
    return open != null && open > minutes;
  });
  if (later) {
    return { heading: `Closed · opens ${later.open}`, isOpen: false };
  }
  return { heading: 'Closed', isOpen: false };
}

export function isSameLocalDay(iso: string, timezone: string, now: Date): boolean {
  try {
    const a = new Date(iso);
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return fmt.format(a) === fmt.format(now);
  } catch {
    return false;
  }
}

