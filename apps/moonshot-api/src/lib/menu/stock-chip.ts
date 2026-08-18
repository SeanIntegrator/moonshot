import type { StockChipKey } from '@moonshot/types';
import { classifyModifierListRole } from '../pos-adapters/square/role-hints.js';

const SHOT_ALIASES = ['shot', 'shots', 'espresso shot', 'espresso shots'];
const BEAN_ALIASES = ['bean', 'beans', 'coffee beans'];
const PREP_ALIASES = [
  'ice',
  'ice level',
  'temperature',
  'temp',
  'milk temperature',
  'texture',
  'milk texture',
];

function normaliseName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Map a modifier-list name onto a Stock filter chip. Unknown lists land on toppings. */
export function classifyStockChip(groupName: string): Exclude<StockChipKey, 'food'> {
  const n = normaliseName(groupName);
  // Prep lists first — "Milk Temperature" would otherwise match the milk role.
  if (PREP_ALIASES.some((a) => n === a || n.includes(a))) return 'shots';
  if (SHOT_ALIASES.some((a) => n === a || n.includes(a))) return 'shots';
  if (BEAN_ALIASES.some((a) => n === a || n.includes(a))) return 'beans';
  const role = classifyModifierListRole(groupName);
  if (role === 'milk') return 'milk';
  if (role === 'syrup') return 'syrup';
  if (role === 'topping') return 'toppings';
  return 'toppings';
}
