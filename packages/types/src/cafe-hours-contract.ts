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

/** One-off calendar day that replaces the weekday template. `date` is `YYYY-MM-DD`. */
export interface CafeHoursOverride {
  date: string;
  label: string | null;
  closed: boolean;
  intervals: CafeHoursInterval[];
}

export const LAST_ORDER_BUFFER_MINUTES = [0, 10, 15, 20, 30, 45, 60] as const;
export type LastOrderBufferMinutes = (typeof LAST_ORDER_BUFFER_MINUTES)[number];
export const DEFAULT_LAST_ORDER_BUFFER_MINUTES: LastOrderBufferMinutes = 20;

export type CafeOpenReason = 'open' | 'closed' | 'paused' | 'buffer';

export interface CafeOpenStatus {
  /** Accepting new order-ahead orders (hours + overrides + pause + last-order buffer). */
  isOpen: boolean;
  /** Short Home caption, e.g. `Open · closes 4:00 pm` / `Closed · opens 8:00 am`. */
  caption: string;
  reason: CafeOpenReason;
}

export type PauseDuration = '15m' | '30m' | '1h' | 'rest_of_today';

export const PAUSE_DURATION_VALUES: readonly PauseDuration[] = [
  '15m',
  '30m',
  '1h',
  'rest_of_today',
] as const;

export interface CafeOpenStatusExtras {
  pausedUntil?: Date | string | null;
  overrides?: CafeHoursOverride[];
  lastOrderBufferMinutes?: number;
}
