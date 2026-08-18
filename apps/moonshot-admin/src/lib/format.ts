export function formatGbpMinor(minor: number, currency = 'GBP'): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(minor / 100);
}

/** `TUESDAY 12 AUGUST` — Overview hero date line. */
export function formatUkDateHeading(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
    .format(date)
    .toUpperCase();
}

/** `25 Aug` — one-off hours and connection meta. */
export function formatUkShortDate(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: 'numeric',
    month: 'short',
  }).format(date);
}

/** 24-hour `HH:mm` in the café timezone. en-GB can yield `24` at midnight. */
export function formatTime24(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const hourRaw = parts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  const hour = hourRaw === '24' ? '00' : hourRaw;
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}
