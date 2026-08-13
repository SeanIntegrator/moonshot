import type { CafeTheme, CafeThemeColors } from '@moonshot/types';
import {
  adjustHsl,
  contrastTextOn,
  hexToRgb,
  mixHex,
  normalizeHex,
  rgbToHsl,
} from './color-utils.js';

/**
 * Seed brand-related surfaces from a café brand colour.
 * Keeps pack page background + primary/muted text; never mutates semantics.
 */
export function deriveBrandSurfaces(
  pack: CafeTheme,
  brandHex: string,
): CafeThemeColors {
  const primary = normalizeHex(brandHex);
  if (!primary) return { ...pack.colors };

  const sat = saturationOf(primary);
  const primaryContrast = contrastTextOn(primary);
  // Darker, slightly desaturated accent for secondary chrome (~30% less chroma).
  const secondary = adjustHsl(primary, { darken: 0.12, s: Math.max(0, sat * 0.7) });
  const heroBg = adjustHsl(primary, { darken: 0.28, s: Math.max(0, sat * 0.75) });
  const heroText = contrastTextOn(heroBg);

  return {
    ...pack.colors,
    primary,
    primaryContrast,
    secondary,
    heroBg,
    heroText,
    surface: mixHex(pack.colors.surface, primary, 0.12),
    surfaceElevated: mixHex(pack.colors.surfaceElevated, primary, 0.06),
    border: mixHex(pack.colors.border, primary, 0.15),
  };
}

function saturationOf(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return rgbToHsl(rgb).s;
}
