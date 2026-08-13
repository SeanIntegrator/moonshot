import type {
  NormalisedMenuItem,
  NormalisedOrderLineModifier,
  OrderLineModifierSelectionInput,
} from '@moonshot/types';
import { modifierSummary } from './format.js';

/**
 * True when the selected option is the group's / size's standard variant.
 * Prefers the order-time `isDefault` snapshot; falls back to the live menu
 * for older rows that predate that field.
 */
export function isStandardModifierVariant(
  mod: NormalisedOrderLineModifier,
  menuItem?: NormalisedMenuItem | null,
): boolean {
  if (mod.isDefault === true) return true;
  if (mod.isDefault === false) return false;
  if (!menuItem) return false;

  if (mod.isSize) {
    return menuItem.sizes.some((s) => s.id === mod.optionId && s.isDefault);
  }

  const group = menuItem.modifierGroups.find((g) => g.id === mod.groupId);
  return group?.options.some((o) => o.id === mod.optionId && o.isDefault) === true;
}

/**
 * Customer-facing caption under a drink name — non-default options only.
 * Hides Hot / Whole / House (etc.) so captions read "Oat" or "Extra Hot".
 */
export function customerModifierSummary(
  modifiers: NormalisedOrderLineModifier[],
  menuItem?: NormalisedMenuItem | null,
): string {
  const custom = modifiers.filter((m) => !isStandardModifierVariant(m, menuItem));
  return modifierSummary(custom);
}

type CartLineSelections = {
  sizeId?: string | null;
  modifiers: OrderLineModifierSelectionInput[];
};

/**
 * Non-standard selections only — default size / default options stay hidden.
 * Used by checkout line subtitles so Regular / Whole milk don't clutter the row.
 */
export function nonStandardCartLineLabels(
  item: NormalisedMenuItem | undefined,
  line: CartLineSelections,
): string[] {
  if (!item) return [];
  const parts: string[] = [];
  const size = line.sizeId ? item.sizes.find((s) => s.id === line.sizeId) : undefined;
  if (size && !size.isDefault) parts.push(size.name);
  for (const sel of line.modifiers) {
    const g = item.modifierGroups.find((x) => x.id === sel.groupId);
    const o = g?.options.find((x) => x.id === sel.optionId);
    if (o && !o.isDefault) parts.push(o.name);
  }
  return parts;
}
