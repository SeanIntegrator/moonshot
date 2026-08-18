import { describe, expect, it } from 'vitest';
import { formatExtraMinor, minorToPoundsInput, poundsToMinor } from './extra-price.js';

describe('formatExtraMinor', () => {
  it('shows Free for zero', () => {
    expect(formatExtraMinor(0)).toBe('Free');
  });

  it('shows pence under a pound', () => {
    expect(formatExtraMinor(50)).toBe('+50p');
    expect(formatExtraMinor(40)).toBe('+40p');
  });

  it('shows pounds at or above 100p', () => {
    expect(formatExtraMinor(100)).toBe('+£1.00');
    expect(formatExtraMinor(120)).toBe('+£1.20');
  });
});

describe('pounds input round-trip', () => {
  it('parses pounds to minor units', () => {
    expect(poundsToMinor('0.40')).toBe(40);
    expect(poundsToMinor('1.20')).toBe(120);
    expect(poundsToMinor('')).toBe(0);
  });

  it('formats minor units for the field', () => {
    expect(minorToPoundsInput(0)).toBe('0.00');
    expect(minorToPoundsInput(40)).toBe('0.40');
    expect(minorToPoundsInput(380)).toBe('3.80');
    expect(String(380 / 100)).toBe('3.8');
  });
});
