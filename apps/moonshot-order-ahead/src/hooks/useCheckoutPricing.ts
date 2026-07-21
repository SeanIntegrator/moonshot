import type { NormalisedMenuItem, OrderLineModifierSelectionInput } from '@moonshot/types';
import { useMemo } from 'react';
import type { CartLine } from '../providers/CartProvider.js';
import { unitPriceForItem } from '../lib/menu-price-utils.js';

export type PricedCartLine = {
  line: CartLine;
  item: NormalisedMenuItem | undefined;
  unit: number | null;
};

function drinkDiscountMinor(pricedLines: PricedCartLine[]): number {
  let max = 0;
  for (const row of pricedLines) {
    if (!row.item || row.unit == null) continue;
    if (row.item.category === 'hot_drinks' || row.item.category === 'cold_drinks') {
      max = Math.max(max, row.unit);
    }
  }
  return max;
}

/** Client-side checkout totals — server remains source of truth on place order. */
export function useCheckoutPricing(params: {
  lines: CartLine[];
  menuItems: NormalisedMenuItem[] | undefined;
  applyReward: boolean;
  hasRewards: boolean;
}): {
  pricedLines: PricedCartLine[];
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  itemCount: number;
} {
  const { lines, menuItems, applyReward, hasRewards } = params;

  const pricedLines = useMemo(() => {
    if (!menuItems) return [];
    return lines.map((line) => {
      const item = menuItems.find((i) => i.id === line.menuItemId);
      const unit = item
        ? unitPriceForItem(item, line.sizeId, line.modifiers as OrderLineModifierSelectionInput[])
        : null;
      return { line, item, unit };
    });
  }, [menuItems, lines]);

  const subtotalMinor = useMemo(
    () =>
      pricedLines.reduce((sum, row) => {
        if (row.unit == null) return sum;
        return sum + row.unit * row.line.quantity;
      }, 0),
    [pricedLines],
  );

  const discountMinor = applyReward && hasRewards ? drinkDiscountMinor(pricedLines) : 0;
  const totalMinor = Math.max(0, subtotalMinor - discountMinor);
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);

  return { pricedLines, subtotalMinor, discountMinor, totalMinor, itemCount };
}
