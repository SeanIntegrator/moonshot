import type {
  NormalisedMenu,
  NormalisedMenuItem,
  OrderLineModifierSelectionInput,
} from '@moonshot/types';
import { defaultSizeId, unitPriceForItem } from './menu-price-utils.js';

/**
 * Home “Why not try” suggestion when the customer has no usual order.
 *
 * Hardcoded to Flat White for launch. Intended extension points:
 * - Admin-configurable featured suggestion per café
 * - Auto-recommend from ordering patterns / popularity
 */
export const WHY_NOT_TRY_ITEM_NAME = 'Flat white';

export type HomeSuggestVariant = 'usual' | 'whyNotTry';

export function findWhyNotTryItem(menu: NormalisedMenu | null | undefined): NormalisedMenuItem | null {
  if (!menu) return null;
  const needle = WHY_NOT_TRY_ITEM_NAME.toLowerCase();
  const available = menu.items.filter((i) => i.isAvailable);
  return (
    available.find((i) => i.name.trim().toLowerCase() === needle) ??
    available.find((i) => i.name.trim().toLowerCase().includes(needle)) ??
    null
  );
}

/** Default size + single-select modifiers — mirrors ItemDetail pre-selection. */
export function defaultSelectionsForItem(item: NormalisedMenuItem): {
  sizeId: string | null;
  modifiers: OrderLineModifierSelectionInput[];
  optionNames: string[];
} {
  const sizeId = defaultSizeId(item.sizes ?? []);
  const modifiers: OrderLineModifierSelectionInput[] = [];
  const optionNames: string[] = [];

  if (sizeId) {
    const size = item.sizes.find((s) => s.id === sizeId);
    if (size?.name) optionNames.push(size.name);
  }

  for (const g of item.modifierGroups) {
    if (g.selectionType !== 'single') continue;
    const pick = g.options.find((o) => o.isDefault) ?? g.options[0];
    if (!pick) continue;
    modifiers.push({ groupId: g.id, optionId: pick.id });
    optionNames.push(pick.name);
  }

  return { sizeId, modifiers, optionNames };
}

export function whyNotTryTotalMinor(item: NormalisedMenuItem): number {
  const { sizeId, modifiers } = defaultSelectionsForItem(item);
  return unitPriceForItem(item, sizeId, modifiers);
}
