/**
 * Order-ahead re-exports café packs / resolve from `@moonshot/domain`.
 * Packs live in domain so Admin preview + API validation share one source.
 */
export {
  coerceBaseThemeId,
  deriveBrandSurfaces,
  FALLBACK_BASE_THEME_ID,
  getThemePack,
  listThemePacks,
  livelyTheme,
  minimalTheme,
  organicTheme,
  radiiFromCardStyle,
  resolveCafeTheme,
} from '@moonshot/domain';

import type { BaseThemeId, CafeTheme, CafeThemeOverrides } from '@moonshot/types';
import { resolveCafeTheme as resolve } from '@moonshot/domain';

/** @deprecated Prefer resolveCafeTheme — kept for call-site migration. */
export function getTheme(baseId: BaseThemeId | string, overrides?: CafeThemeOverrides): CafeTheme {
  return resolve(baseId, overrides);
}
