import type {
  NormalisedItemSize,
  NormalisedMenuItem,
  OrderLineModifierSelectionInput,
} from '@moonshot/types';

/** Lowest size price when item has sizes; otherwise base price. */
export function menuItemListPriceMinor(item: NormalisedMenuItem): number {
  if (item.sizes?.length) {
    return Math.min(...item.sizes.map((s) => s.priceMinor));
  }
  return item.priceMinor;
}

export function defaultSizeId(sizes: NormalisedItemSize[]): string | null {
  if (sizes.length === 0) return null;
  const def = sizes.find((s) => s.isDefault);
  return (def ?? sizes[0])!.id;
}

export function sizeById(
  sizes: NormalisedItemSize[],
  sizeId: string | null | undefined,
): NormalisedItemSize | null {
  if (!sizeId || sizes.length === 0) return null;
  return sizes.find((s) => s.id === sizeId) ?? null;
}

/** Sum of selected modifier option price deltas (minor units). */
export function modifierDeltaMinor(
  item: NormalisedMenuItem,
  modifiers: OrderLineModifierSelectionInput[],
): number {
  let delta = 0;
  for (const sel of modifiers) {
    const g = item.modifierGroups.find((x) => x.id === sel.groupId);
    const opt = g?.options.find((o) => o.id === sel.optionId);
    if (opt) delta += opt.priceMinor;
  }
  return delta;
}

/** Base unit price for cart/checkout preview (size or item base + modifier deltas). */
export function unitPriceForItem(
  item: NormalisedMenuItem,
  sizeId: string | null | undefined,
  modifiersOrDelta: OrderLineModifierSelectionInput[] | number,
): number {
  const delta =
    typeof modifiersOrDelta === 'number'
      ? modifiersOrDelta
      : modifierDeltaMinor(item, modifiersOrDelta);
  const size = sizeById(item.sizes ?? [], sizeId);
  const base = size ? size.priceMinor : item.priceMinor;
  return base + delta;
}
