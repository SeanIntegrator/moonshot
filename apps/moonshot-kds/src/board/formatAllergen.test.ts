import { describe, expect, it } from 'vitest';
import { formatAllergenLabel } from './formatAllergen.js';

describe('formatAllergenLabel', () => {
  it('humanises underscore-separated allergen codes', () => {
    expect(formatAllergenLabel('gluten_wheat')).toBe('Gluten Wheat');
  });

  it('capitalises a single-token code', () => {
    expect(formatAllergenLabel('milk')).toBe('Milk');
  });
});
