import type { StockChipKey } from '@moonshot/types';

const MILK = ['milk', 'milks', 'dairy', 'alt milk'];
const SYRUP = ['syrup', 'syrups', 'flavour', 'flavor', 'flavours', 'flavors'];
const TOPPING = ['topping', 'toppings', 'extras', 'add-ons', 'addons'];
const SHOTS = ['shot', 'shots', 'ice', 'temperature', 'texture', 'temp'];
const BEANS = ['bean', 'beans'];

function normalise(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function classifyModifierChip(groupName: string): Exclude<StockChipKey, 'food'> {
  const n = normalise(groupName);
  // Prep lists first — "Milk Temperature" would otherwise match milk.
  if (SHOTS.some((a) => n === a || n.includes(a))) return 'shots';
  if (MILK.some((a) => n === a || n.includes(a))) return 'milk';
  if (SYRUP.some((a) => n === a || n.includes(a))) return 'syrup';
  if (BEANS.some((a) => n === a || n.includes(a))) return 'beans';
  if (TOPPING.some((a) => n === a || n.includes(a))) return 'toppings';
  return 'toppings';
}
