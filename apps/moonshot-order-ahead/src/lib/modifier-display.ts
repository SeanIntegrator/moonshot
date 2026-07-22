import type {
  NormalisedMenuItem,
  NormalisedOrderLineModifier,
} from '@moonshot/types';

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
