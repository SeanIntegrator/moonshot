import { describe, expect, it } from 'vitest';
import { formatItemName } from './formatItemName.js';

describe('formatItemName', () => {
  it('returns empty for blank input', () => {
    expect(formatItemName('')).toBe('');
    expect(formatItemName('   ')).toBe('');
  });

  it('title-cases all-lowercase names', () => {
    expect(formatItemName('flat white')).toBe('Flat White');
    expect(formatItemName('iced latte')).toBe('Iced Latte');
  });

  it('preserves already-cased words beyond the first character', () => {
    expect(formatItemName('Flat White')).toBe('Flat White');
    expect(formatItemName('macchiato')).toBe('Macchiato');
  });

  it('trims surrounding whitespace', () => {
    expect(formatItemName('  croissant  ')).toBe('Croissant');
  });
});
