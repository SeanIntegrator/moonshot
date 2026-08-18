export type WeekdayPillOption = { value: string; label: string };

/** Loyalty `doubleStampDays` stores en-GB long names, not `WeekdayKey`. */
export const WEEKDAY_PILLS_LONG: readonly WeekdayPillOption[] = [
  { value: 'Monday', label: 'Mon' },
  { value: 'Tuesday', label: 'Tue' },
  { value: 'Wednesday', label: 'Wed' },
  { value: 'Thursday', label: 'Thu' },
  { value: 'Friday', label: 'Fri' },
  { value: 'Saturday', label: 'Sat' },
  { value: 'Sunday', label: 'Sun' },
];

export const WEEKDAY_PILLS_KEYS: readonly WeekdayPillOption[] = [
  { value: 'mon', label: 'Mon' },
  { value: 'tue', label: 'Tue' },
  { value: 'wed', label: 'Wed' },
  { value: 'thu', label: 'Thu' },
  { value: 'fri', label: 'Fri' },
  { value: 'sat', label: 'Sat' },
  { value: 'sun', label: 'Sun' },
];
