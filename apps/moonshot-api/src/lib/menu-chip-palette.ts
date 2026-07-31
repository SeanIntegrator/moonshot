/**
 * Shared KDS chip colours/labels for milk and syrup options.
 * Used by template onboarding and Square catalog import (name-matched).
 */

export type ChipMeta = { colorHex: string | null; chipLabel: string };

export const MILK_CHIP: Record<string, ChipMeta> = {
  whole: { colorHex: '#f5f0e8', chipLabel: 'WM' },
  skinny: { colorHex: '#fafafa', chipLabel: 'Sk' },
  oat: { colorHex: '#e8dcc8', chipLabel: 'Oa' },
  almond: { colorHex: '#f4a6b8', chipLabel: 'Al' },
  coconut: { colorHex: '#ffffff', chipLabel: 'Co' },
  soy: { colorHex: '#f5e6a8', chipLabel: 'So' },
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
