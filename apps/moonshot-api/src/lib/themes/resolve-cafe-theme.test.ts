import { describe, expect, it } from 'vitest';
import {
  coerceBaseThemeId,
  contrastRatio,
  deriveBrandSurfaces,
  getThemePack,
  isHexColor,
  normalizeHex,
  resolveCafeTheme,
} from '@moonshot/domain';

describe('theme id coercion', () => {
  it('maps legacy packs onto the three launch ids', () => {
    expect(coerceBaseThemeId('heritage')).toBe('minimal');
    expect(coerceBaseThemeId('botanical')).toBe('organic');
    expect(coerceBaseThemeId('classic')).toBe('organic');
    expect(coerceBaseThemeId('bold')).toBe('lively');
    expect(coerceBaseThemeId('unknown')).toBe('minimal');
  });
});

describe('deriveBrandSurfaces', () => {
  it('sets primary and a readable contrast on light and dark brands', () => {
    const pack = getThemePack('minimal');
    const light = deriveBrandSurfaces(pack, '#ffffff');
    expect(normalizeHex(light.primary)).toBe('#ffffff');
    expect(contrastRatio(light.primary, light.primaryContrast)).toBeGreaterThanOrEqual(4.5);

    const dark = deriveBrandSurfaces(pack, '#0d1b3d');
    expect(normalizeHex(dark.primary)).toBe('#0d1b3d');
    expect(contrastRatio(dark.primary, dark.primaryContrast)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps pack canvas text and semantics', () => {
    const pack = getThemePack('organic');
    const next = deriveBrandSurfaces(pack, '#8b4513');
    expect(next.background).toBe(pack.colors.background);
    expect(next.text).toBe(pack.colors.text);
    expect(next.success).toBe(pack.colors.success);
  });
});

describe('resolveCafeTheme', () => {
  it('applies heading font without changing body family', () => {
    const resolved = resolveCafeTheme('lively', {
      brand: { headingFontId: 'playfair-display' },
    });
    expect(resolved.typography.headingFamily).toContain('Playfair Display');
    expect(resolved.typography.bodyFamily).toContain('Outfit');
    expect(resolved.typography.webfontUrls?.some((u) => u.includes('Playfair'))).toBe(true);
  });

  it('applies brand colour recipe', () => {
    const resolved = resolveCafeTheme('minimal', { brand: { color: '#2563eb' } });
    expect(resolved.colors.primary).toBe('#2563eb');
    expect(isHexColor(resolved.colors.heroBg)).toBe(true);
  });
});
