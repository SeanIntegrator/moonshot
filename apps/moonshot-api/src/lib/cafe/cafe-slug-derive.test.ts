import { describe, expect, it } from 'vitest';
import { deriveCafeSlugFromName, slugifyCafeName, validateCafeSlug } from '../cafe-slug.js';

describe('slugifyCafeName', () => {
  it('lowercases and hyphenates', () => {
    expect(slugifyCafeName('Clay & Bean')).toBe('clay-bean');
  });

  it('strips leading/trailing hyphens', () => {
    expect(slugifyCafeName('  --Hello--  ')).toBe('hello');
  });
});

describe('deriveCafeSlugFromName', () => {
  it('derives from a normal café name', () => {
    expect(deriveCafeSlugFromName('Clay & Bean')).toBe('clay-bean');
  });

  it('pads names that slugify to under 3 characters', () => {
    expect(deriveCafeSlugFromName('AB')).toBe('abb');
    expect(deriveCafeSlugFromName('A')).toBe('aaa');
  });

  it('falls back to cafe for non-latin names', () => {
    expect(deriveCafeSlugFromName('咖啡')).toBe('cafe');
  });

  it('always produces a valid slug', () => {
    for (const name of ['Shed', 'X', '!!!', 'The Best Coffee Shop In Town Ever']) {
      const slug = deriveCafeSlugFromName(name);
      expect(validateCafeSlug(slug).ok).toBe(true);
    }
  });
});
