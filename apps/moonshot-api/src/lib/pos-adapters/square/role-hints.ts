/**
 * Classify Square modifier-list names into Moonshot roles for chip palette
 * lookup and KDS `modifierClassification` sync. Square keeps its own names;
 * we only hint so the KDS board still recognises milks / syrups / toppings.
 */

export type ModifierRoleHint = 'milk' | 'syrup' | 'topping' | 'other';

const MILK_ALIASES = [
  'milk',
  'milks',
  'milk options',
  'milk choice',
  'milk type',
  'dairy',
  'alt milk',
  'alternative milk',
];

const SYRUP_ALIASES = [
  'syrup',
  'syrups',
  'flavour',
  'flavor',
  'flavours',
  'flavors',
  'flavour syrups',
  'flavor syrups',
];

const TOPPING_ALIASES = [
  'topping',
  'toppings',
  'extras',
  'extra',
  'add-ons',
  'addons',
  'add ons',
];

function normaliseName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function classifyModifierListRole(listName: string): ModifierRoleHint {
  const n = normaliseName(listName);
  if (!n) return 'other';
  if (MILK_ALIASES.some((a) => n === a || n.includes(a))) return 'milk';
  if (SYRUP_ALIASES.some((a) => n === a || n.includes(a))) return 'syrup';
  if (TOPPING_ALIASES.some((a) => n === a || n.includes(a))) return 'topping';
  return 'other';
}

/** Build a posGroupId → role map from Square list names. */
export function buildRoleHintMap(
  lists: Array<{ posGroupId: string; name: string }>,
): Map<string, ModifierRoleHint> {
  const map = new Map<string, ModifierRoleHint>();
  for (const list of lists) {
    map.set(list.posGroupId, classifyModifierListRole(list.name));
  }
  return map;
}
