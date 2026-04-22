import type { BaseThemeId, CafeTheme } from '@moonshot/types';
import { boldTheme } from './bold.js';
import { botanicalTheme } from './botanical.js';
import { classicTheme } from './classic.js';
import { heritageTheme } from './heritage.js';
import { minimalTheme } from './minimal.js';

const baseThemes: Record<BaseThemeId, CafeTheme> = {
  heritage: heritageTheme,
  botanical: botanicalTheme,
  minimal: minimalTheme,
  bold: boldTheme,
  classic: classicTheme,
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Deep-merge café overrides onto a base template theme */
export function deepMerge<T extends Record<string, unknown>>(base: T, patch: Partial<T>): T {
  const out = { ...base } as T;
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const pv = patch[key];
    const bv = base[key];
    if (isPlainObject(pv) && isPlainObject(bv as unknown)) {
      out[key] = deepMerge(bv as Record<string, unknown>, pv as Record<string, unknown>) as T[keyof T];
    } else if (pv !== undefined) {
      out[key] = pv as T[keyof T];
    }
  }
  return out;
}

export function getTheme(baseId: BaseThemeId, overrides?: Partial<CafeTheme>): CafeTheme {
  const base = baseThemes[baseId] ?? heritageTheme;
  if (!overrides) {
    return { ...base, id: baseId };
  }
  const merged = deepMerge(base as unknown as Record<string, unknown>, overrides as Record<string, unknown>);
  return { ...(merged as unknown as CafeTheme), id: baseId };
}
