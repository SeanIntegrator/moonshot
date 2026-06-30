import type { NormalisedItemSize, NormalisedMenuItem } from '@moonshot/types';

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

export function sizeById(sizes: NormalisedItemSize[], sizeId: string | null | undefined): NormalisedItemSize | null {
  if (!sizeId || sizes.length === 0) return null;
  return sizes.find((s) => s.id === sizeId) ?? null;
}

/** Base unit price for cart/checkout preview */
export function unitPriceForItem(
  item: NormalisedMenuItem,
  sizeId: string | null | undefined,
  modifierDeltaMinor: number,
): number {
  const size = sizeById(item.sizes ?? [], sizeId);
  const base = size ? size.priceMinor : item.priceMinor;
  return base + modifierDeltaMinor;
}
