/**
 * UK Food Standards Agency — 14 allergens declaration list (stable codes for API + UI).
 * Client sends these strings; server validates subset only.
 */
export const UK_FSA_ALLERGENS = [
  'celery',
  'cereals_containing_gluten',
  'crustaceans',
  'eggs',
  'fish',
  'lupin',
  'milk',
  'molluscs',
  'mustard',
  'nuts',
  'peanuts',
  'sesame',
  'soya',
  'sulphites',
] as const;

export type UkFsaAllergenCode = (typeof UK_FSA_ALLERGENS)[number];

export const UK_FSA_ALLERGEN_SET = new Set<string>(UK_FSA_ALLERGENS);
