/**
 * Shared KDS chip colours/labels for milk and syrup options.
 * Used by template onboarding and Square catalog import (name-matched).
 *
 * Plant milks follow Rude Health pack colours so baristas can scan by brand hue:
 * almond pink, coconut mid blue, soy forest green, oat pale brown.
 * Dairy: whole = off-white; skinny/skimmed = muted red; semi = bright red.
 */

export type ChipMeta = { colorHex: string | null; chipLabel: string };

export const MILK_CHIP: Record<string, ChipMeta> = {
  whole: { colorHex: '#f7f4ee', chipLabel: 'WM' },
  skinny: { colorHex: '#c44548', chipLabel: 'Sk' },
  skimmed: { colorHex: '#c44548', chipLabel: 'Sk' },
  semi: { colorHex: '#e6001a', chipLabel: 'Sm' },
  'semi-skimmed': { colorHex: '#e6001a', chipLabel: 'Sm' },
  oat: { colorHex: '#f0e4d0', chipLabel: 'Oa' },
  almond: { colorHex: '#ff2d87', chipLabel: 'Al' },
  coconut: { colorHex: '#4a8fd4', chipLabel: 'Co' },
  soy: { colorHex: '#145a32', chipLabel: 'So' },
  soya: { colorHex: '#145a32', chipLabel: 'So' },
  cashew: { colorHex: '#e8d4b8', chipLabel: 'Ca' },
};

export const SYRUP_CHIP: Record<string, ChipMeta> = {
  vanilla: { colorHex: '#f5e6c8', chipLabel: 'Va' },
  caramel: { colorHex: '#c68642', chipLabel: 'Ca' },
  hazelnut: { colorHex: '#8b5a2b', chipLabel: 'Ha' },
  'white-chocolate': { colorHex: '#f0ebe3', chipLabel: 'WC' },
  'white chocolate': { colorHex: '#f0ebe3', chipLabel: 'WC' },
  strawberry: { colorHex: '#f4a6b8', chipLabel: 'St' },
  raspberry: { colorHex: '#d4507a', chipLabel: 'Ra' },
  blueberry: { colorHex: '#4a6fa5', chipLabel: 'Bl' },
  'salted-caramel': { colorHex: '#b8860b', chipLabel: 'SC' },
  'salted caramel': { colorHex: '#b8860b', chipLabel: 'SC' },
  honey: { colorHex: '#f0b429', chipLabel: 'Ho' },
};

function slugifyOptionKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Look up chip meta by option display name.
 * Falls back to first-two-letters label and null colour when unknown.
 */
export function chipMetaForOptionName(
  name: string,
  role: 'milk' | 'syrup' | 'other' = 'other',
): ChipMeta {
  const key = slugifyOptionKey(name);
  const map = role === 'milk' ? MILK_CHIP : role === 'syrup' ? SYRUP_CHIP : null;
  if (map) {
    const hit = map[key] ?? map[name.trim().toLowerCase()];
    if (hit) return hit;
  }
  // Also try the other map for ambiguous imports.
  const milkHit = MILK_CHIP[key];
  if (milkHit) return milkHit;
  const syrupHit = SYRUP_CHIP[key];
  if (syrupHit) return syrupHit;

  return {
    colorHex: null,
    chipLabel: name.trim().slice(0, 2) || '??',
  };
}
