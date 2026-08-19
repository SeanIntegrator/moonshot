/**
 * Modifier list taxonomy — slot is stored on `modifier_groups`; family drives Menu/Stock tabs.
 */

/** Fine-grained slot on a modifier list (source of truth in Postgres). */
export type ModifierSlot =
  | 'milk'
  | 'syrup'
  | 'shots'
  | 'beans'
  | 'milk_temperature'
  | 'milk_texture'
  | 'ice_level'
  | 'toppings'
  | 'other';

/** Coarse family for admin Menu + Stock chips. */
export type ModifierFamily = 'milk' | 'coffee' | 'flavours' | 'preparation' | 'other';

/** Stock / Menu filter chips — modifier families plus food items. */
export type StockChipKey = ModifierFamily | 'food';

export const MODIFIER_FAMILY_LABELS: Record<ModifierFamily, string> = {
  milk: 'Milk',
  coffee: 'Coffee',
  flavours: 'Flavours',
  preparation: 'Preparation',
  other: 'Other',
};

export const MODIFIER_SLOT_LABELS: Record<ModifierSlot, string> = {
  milk: 'Milk choice',
  syrup: 'Syrup',
  shots: 'Shots',
  beans: 'Beans',
  milk_temperature: 'Milk temperature',
  milk_texture: 'Milk texture',
  ice_level: 'Ice level',
  toppings: 'Toppings',
  other: 'Unclassified',
};

export const MODIFIER_SLOT_VALUES: readonly ModifierSlot[] = [
  'milk',
  'syrup',
  'shots',
  'beans',
  'milk_temperature',
  'milk_texture',
  'ice_level',
  'toppings',
  'other',
] as const;

export function isModifierSlot(value: unknown): value is ModifierSlot {
  return typeof value === 'string' && (MODIFIER_SLOT_VALUES as readonly string[]).includes(value);
}

export function isModifierFamily(value: unknown): value is ModifierFamily {
  return (
    value === 'milk' ||
    value === 'coffee' ||
    value === 'flavours' ||
    value === 'preparation' ||
    value === 'other'
  );
}
