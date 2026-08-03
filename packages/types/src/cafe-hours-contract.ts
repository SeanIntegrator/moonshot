/**
 * Weekly opening-hours shape (local wall-clock in the café's timezone).
 * Runtime helpers (`normalizeCafeHours`, `cafeOpenStatus`, …) live in `@moonshot/domain`.
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
