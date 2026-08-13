import type { BaseThemeId, CafeTheme, CafeThemeOverrides } from '@moonshot/types';
import { deriveBrandSurfaces } from './derive-brand-surfaces.js';
import { getHeadingFont } from './heading-fonts.js';
import { livelyTheme } from './packs/lively.js';
import { minimalTheme } from './packs/minimal.js';
import { organicTheme } from './packs/organic.js';
import { normalizeHex } from './color-utils.js';

export const DEFAULT_BASE_THEME_ID: BaseThemeId = 'organic';
export const FALLBACK_BASE_THEME_ID: BaseThemeId = 'minimal';

const BASE_THEMES: Record<BaseThemeId, CafeTheme> = {
  minimal: minimalTheme,
  organic: organicTheme,
  lively: livelyTheme,
};

/** Legacy theme_id values → current packs (migration 031 + runtime). */
const LEGACY_THEME_MAP: Record<string, BaseThemeId> = {
  heritage: 'minimal',
  minimal: 'minimal',
  botanical: 'organic',
  classic: 'organic',
  organic: 'organic',
  bold: 'lively',
  lively: 'lively',
};

export function isBaseThemeId(value: string): value is BaseThemeId {
  return value === 'minimal' || value === 'organic' || value === 'lively';
}

/** Map stored / legacy theme ids onto the three launch packs. */
export function coerceBaseThemeId(raw: string | null | undefined): BaseThemeId {
  if (!raw) return FALLBACK_BASE_THEME_ID;
  const mapped = LEGACY_THEME_MAP[raw] ?? (isBaseThemeId(raw) ? raw : null);
  return mapped ?? FALLBACK_BASE_THEME_ID;
}

export function getThemePack(themeId: BaseThemeId): CafeTheme {
  return BASE_THEMES[themeId] ?? BASE_THEMES[FALLBACK_BASE_THEME_ID];
}

export function listThemePacks(): CafeTheme[] {
  return [minimalTheme, organicTheme, livelyTheme];
}

/**
 * Resolve a café theme: child pack + optional brand colour / heading font recipe.
 */
export function resolveCafeTheme(
  themeId: string,
  overrides?: CafeThemeOverrides | null,
): CafeTheme {
  const id = coerceBaseThemeId(themeId);
  const pack = getThemePack(id);
  let colors = pack.colors;
  let typography = { ...pack.typography };

  const brandColor = overrides?.brand?.color;
  if (typeof brandColor === 'string' && brandColor.trim()) {
    const hex = normalizeHex(brandColor);
    if (hex) {
      colors = deriveBrandSurfaces(pack, hex);
    }
  }

  const fontId = overrides?.brand?.headingFontId;
  if (typeof fontId === 'string' && fontId.trim()) {
    const font = getHeadingFont(fontId.trim());
    if (font) {
      const urls = new Set(typography.webfontUrls ?? []);
      urls.add(font.webfontUrl);
      typography = {
        ...typography,
        headingFamily: font.family,
        webfontUrls: [...urls],
      };
    }
  }

  return {
    id,
    colors,
    typography,
    layout: pack.layout,
  };
}
