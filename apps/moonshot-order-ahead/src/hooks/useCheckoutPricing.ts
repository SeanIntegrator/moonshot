import type { NormalisedMenuItem, OrderLineModifierSelectionInput } from '@moonshot/types';
import { computeLoyaltyRewardDiscountMinor } from '@moonshot/types';
import { useMemo } from 'react';
import type { CartLine } from '../providers/CartProvider.js';
import { unitPriceForItem } from '../lib/menu-price-utils.js';

export type PricedCartLine = {
  line: CartLine;
  item: NormalisedMenuItem | undefined;
  unit: number | null;
};

/** Client-side checkout totals — server remains source of truth on place order. */
export function useCheckoutPricing(params: {
  lines: CartLine[];
  menuItems: NormalisedMenuItem[] | undefined;
  /** Selected reward type, or null when none applied. */
  rewardType: string | null;
}): {
  pricedLines: PricedCartLine[];
  subtotalMinor: number;
  discountMinor: number;
  totalMinor: number;
  itemCount: number;
} {
  const { lines, menuItems, rewardType } = params;

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

  const discountMinor = useMemo(() => {
    if (!rewardType) return 0;
    const discountLines = pricedLines
      .filter((row): row is PricedCartLine & { item: NormalisedMenuItem; unit: number } =>
        Boolean(row.item && row.unit != null),
      )
      .map((row) => ({ category: row.item.category, unitPriceMinor: row.unit }));
    return computeLoyaltyRewardDiscountMinor(rewardType, discountLines);
  }, [pricedLines, rewardType]);

  const totalMinor = Math.max(0, subtotalMinor - discountMinor);
  const itemCount = lines.reduce((s, l) => s + l.quantity, 0);

  return { pricedLines, subtotalMinor, discountMinor, totalMinor, itemCount };
}
