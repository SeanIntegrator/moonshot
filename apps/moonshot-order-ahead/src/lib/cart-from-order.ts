import type { NormalisedOrder, NormalisedOrderItem, OrderLineModifierSelectionInput } from '@moonshot/types';
import type { useCart } from '../providers/CartProvider.js';

/** Matches API `SIZE_MODIFIER_GROUP_ID` — legacy rows may only have this group id. */
const SIZE_GROUP_ID = '__item_size__';

function isSizeModifier(m: NormalisedOrderItem['modifiers'][number]): boolean {
  return m.isSize === true || m.groupId === SIZE_GROUP_ID;
}

/** Map a persisted order line back to cart `upsertLine` params (size + library modifiers). */
export function cartParamsFromOrderLine(li: NormalisedOrderItem): {
  menuItemId: string;
  sizeId: string | null;
  quantity: number;
  modifiers: OrderLineModifierSelectionInput[];
  allergens: string[];
} | null {
  if (!li.menuItemId) return null;

  const sizeMod = li.modifiers.find(isSizeModifier);
  const modifiers = li.modifiers
    .filter((m) => !isSizeModifier(m))
    .map((m) => ({ groupId: m.groupId, optionId: m.optionId }));

  return {
    menuItemId: li.menuItemId,
    sizeId: sizeMod?.optionId ?? null,
    quantity: li.quantity,
    modifiers,
    allergens: li.allergens,
  };
}

export function reorderFromOrder(
  order: NormalisedOrder,
  upsertLine: ReturnType<typeof useCart>['upsertLine'],
): void {
  for (const li of order.items) {
    const params = cartParamsFromOrderLine(li);
    if (params) upsertLine(params);
  }
}
