import type { BaseThemeId, CafeBrandOverrides, CafeThemeOverrides } from '@moonshot/types';
import {
  isBaseThemeId,
  isHeadingFontId,
  isHexColor,
  normalizeHex,
} from '@moonshot/domain';

export type ThemeMergeResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function parseThemeId(raw: unknown): ThemeMergeResult<BaseThemeId | undefined> {
  if (raw === undefined) return { ok: true, value: undefined };
  if (typeof raw !== 'string' || !isBaseThemeId(raw)) {
    return { ok: false, error: 'themeId must be minimal, organic, or lively' };
  }
  return { ok: true, value: raw };
}

export function parseBrandPatch(raw: unknown): ThemeMergeResult<CafeBrandOverrides | undefined> {
  if (raw === undefined) return { ok: true, value: undefined };
  if (raw === null) {
    return { ok: true, value: { color: null, headingFontId: null } };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'brand must be an object or null' };
  }
  const rec = raw as Record<string, unknown>;
  const out: CafeBrandOverrides = {};

  if (Object.prototype.hasOwnProperty.call(rec, 'color')) {
    const c = rec.color;
    if (c === null) {
      out.color = null;
    } else if (typeof c === 'string') {
      const trimmed = c.trim();
      if (trimmed.length === 0) {
        out.color = null;
      } else if (!isHexColor(trimmed)) {
        return { ok: false, error: 'brand.color must be a #rgb or #rrggbb hex colour' };
      } else {
        out.color = normalizeHex(trimmed);
      }
    } else {
      return { ok: false, error: 'brand.color must be a hex string or null' };
    }
  }

  if (Object.prototype.hasOwnProperty.call(rec, 'headingFontId')) {
    const f = rec.headingFontId;
    if (f === null) {
      out.headingFontId = null;
    } else if (typeof f === 'string') {
      const trimmed = f.trim();
      if (trimmed.length === 0) {
        out.headingFontId = null;
      } else if (!isHeadingFontId(trimmed)) {
        return { ok: false, error: 'brand.headingFontId is not a known heading font' };
      } else {
        out.headingFontId = trimmed;
      }
    } else {
      return { ok: false, error: 'brand.headingFontId must be a string or null' };
    }
  }

  return { ok: true, value: out };
}

/** Merge brand recipe into existing theme_overrides JSON. */
export function mergeThemeOverrides(
  existing: CafeThemeOverrides,
  brandPatch: CafeBrandOverrides | undefined,
): CafeThemeOverrides {
  if (brandPatch === undefined) return existing;

  const prev = existing.brand ?? {};
  const nextBrand: CafeBrandOverrides = { ...prev };

  if (Object.prototype.hasOwnProperty.call(brandPatch, 'color')) {
    if (brandPatch.color === null) {
      delete nextBrand.color;
    } else if (brandPatch.color !== undefined) {
      nextBrand.color = brandPatch.color;
    }
  }

  if (Object.prototype.hasOwnProperty.call(brandPatch, 'headingFontId')) {
    if (brandPatch.headingFontId === null) {
      delete nextBrand.headingFontId;
    } else if (brandPatch.headingFontId !== undefined) {
      nextBrand.headingFontId = brandPatch.headingFontId;
    }
  }

  const hasColor = typeof nextBrand.color === 'string' && nextBrand.color.length > 0;
  const hasFont =
    typeof nextBrand.headingFontId === 'string' && nextBrand.headingFontId.length > 0;

  if (!hasColor && !hasFont) {
    return {};
  }

  return { brand: nextBrand };
}
