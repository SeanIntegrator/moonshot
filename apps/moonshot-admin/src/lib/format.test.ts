import { describe, expect, it } from 'vitest';
import { formatGbpMinor, formatTime24, formatUkDateHeading, formatUkShortDate } from './format.js';

describe('formatGbpMinor', () => {
  it('formats pence as GBP currency', () => {
    expect(formatGbpMinor(350)).toBe('£3.50');
  });

  it('formats zero', () => {
    expect(formatGbpMinor(0)).toBe('£0.00');
  });
});

describe('UK locale formatters', () => {
  it('formats a heading date in en-GB long form', () => {
    const d = new Date('2026-08-12T10:00:00.000Z');
    expect(formatUkDateHeading(d, 'UTC')).toBe('WEDNESDAY 12 AUGUST');
  });

  it('formats DD MMM', () => {
    const d = new Date('2026-08-25T10:00:00.000Z');
    expect(formatUkShortDate(d, 'UTC')).toBe('25 Aug');
  });

  it('formats 24-hour time', () => {
    const d = new Date('2026-08-12T15:40:00.000Z');
    expect(formatTime24(d, 'UTC')).toBe('15:40');
  });
});
