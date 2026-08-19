/**
 * Admin stock (86) contracts. Availability for options lives in
 * `modifier_option_availability`; food uses `menu_items.is_available`.
 */

import type { ModifierFamily } from './modifier-family.js';

export type { ModifierFamily, ModifierSlot, StockChipKey } from './modifier-family.js';

export type StockAvailability = 'in' | 'out_today' | 'out';

export interface AdminStockOptionRow {
  optionId: string;
  groupId: string;
  groupName: string;
  name: string;
  chip: ModifierFamily;
  availability: StockAvailability;
  /** In-menu drink items that attach this option's group. */
  usedOnCount: number;
}

export interface AdminStockFoodRow {
  itemId: string;
  name: string;
  availability: 'in' | 'out';
}

export interface AdminStockResponse {
  options: AdminStockOptionRow[];
  food: AdminStockFoodRow[];
  /** Distinct in-menu drinks that currently have at least one 86'd attached option. */
  drinksAffectedCount: number;
}

export interface AdminStockOptionPutBody {
  availability: StockAvailability;
}
