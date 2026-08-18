import {
  WEEKDAY_KEYS,
  emptyCafeHours,
  cafeHoursIntervalsOverlap,
  hhMmToMinutes,
  toHhMm,
  type CafeHours,
  type CafeHoursInterval,
  type WeekdayKey,
} from '@moonshot/domain';

export const DEFAULT_INTERVAL: CafeHoursInterval = { open: '08:00', close: '16:00' };

export const DAY_LABELS: Record<WeekdayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

export type DayDraft = {
  /** Closed when empty; otherwise one or more open/close windows. */
  intervals: CafeHoursInterval[];
};

export type HoursDraft = Record<WeekdayKey, DayDraft>;

export function hoursToDraft(hours: CafeHours): HoursDraft {
  const out = {} as HoursDraft;
  for (const day of WEEKDAY_KEYS) {
    const intervals = hours[day] ?? [];
    out[day] = {
      intervals: intervals.map((iv) => ({ open: iv.open, close: iv.close })),
    };
  }
  return out;
}

export function draftToHours(draft: HoursDraft): CafeHours {
  const hours = emptyCafeHours();
  for (const day of WEEKDAY_KEYS) {
    hours[day] = draft[day].intervals.map((iv) => ({
      open: toHhMm(iv.open) ?? iv.open,
      close: toHhMm(iv.close) ?? iv.close,
    }));
  }
  return hours;
}

export function hoursDraftEqual(a: HoursDraft, b: HoursDraft): boolean {
  return JSON.stringify(draftToHours(a)) === JSON.stringify(draftToHours(b));
}

/** Per-window: invalid or close-not-after-open. */
export function intervalOrderError(open: string, close: string): string | null {
  const o = hhMmToMinutes(toHhMm(open) ?? open);
  const c = hhMmToMinutes(toHhMm(close) ?? close);
  if (o == null || c == null || o >= c) return 'Close must be after open';
  return null;
}

export function dayWindowsError(intervals: CafeHoursInterval[]): string | null {
  for (const iv of intervals) {
    const err = intervalOrderError(iv.open, iv.close);
    if (err) return err;
  }
  if (cafeHoursIntervalsOverlap(intervals)) return 'These times overlap';
  return null;
}

export function hoursDraftError(draft: HoursDraft): string | null {
  for (const day of WEEKDAY_KEYS) {
    const err = dayWindowsError(draft[day].intervals);
    if (err) return err;
  }
  return null;
}
