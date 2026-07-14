import { describe, expect, it } from 'vitest';
import { parseAllowedMenuImageObjectKey } from './menu-image-object-key.js';

describe('parseAllowedMenuImageObjectKey', () => {
  it('accepts template drink keys', () => {
    expect(parseAllowedMenuImageObjectKey('template/drinks/flat-white.webp')).toBe(
      'template/drinks/flat-white.webp',
    );
    expect(parseAllowedMenuImageObjectKey('/template/drinks/espresso.webp')).toBe(
      'template/drinks/espresso.webp',
    );
  });

  it('accepts cafe menu item thumbnail keys', () => {
    const key =
      'cafes/11111111-1111-1111-1111-111111111111/menu-items/22222222-2222-2222-2222-222222222222/thumbnail.webp';
    expect(parseAllowedMenuImageObjectKey(key)).toBe(key);
  });

  it('rejects path traversal and unknown layouts', () => {
    expect(parseAllowedMenuImageObjectKey('template/drinks/../secret.webp')).toBeNull();
    expect(parseAllowedMenuImageObjectKey('cafes/not-a-uuid/menu-items/also-bad/thumbnail.webp')).toBeNull();
    expect(parseAllowedMenuImageObjectKey('other/path.webp')).toBeNull();
    expect(parseAllowedMenuImageObjectKey('')).toBeNull();
  });
});
