import type { BaseThemeId } from '@moonshot/types';

export const THEME_PACKS: ReadonlyArray<{ id: BaseThemeId; label: string; blurb: string }> = [
  { id: 'minimal', label: 'Minimal', blurb: 'White and black, sharp edges.' },
  { id: 'organic', label: 'Organic', blurb: 'Warm clay, rounder, serif headings.' },
  { id: 'lively', label: 'Lively', blurb: 'Bright contrast, soft cards.' },
];

/** Café-typical presets from the v3 Brand mock — not Clay & Bean-specific defaults. */
export const BRAND_COLOUR_PRESETS = [
  '#396a5b',
  '#2f4f45',
  '#6b4f3a',
  '#c4a035',
  '#1b2432',
] as const;
