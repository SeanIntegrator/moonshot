import {
  DRINK_ARCHETYPE_SLOT_GROUP_NAMES,
  type CafeDrinkArchetypeConfig,
  type DrinkArchetypeId,
  type DrinkArchetypeSlot,
  isDrinkArchetypeId,
  isDrinkArchetypeSlot,
  resolveCafeArchetypeRecipe,
  waiveMilkSurchargeFromCharge,
} from '@moonshot/types';

export type LibraryGroupRef = {
  id: string;
  name: string;
  /** When false/empty, syrup (and similar) slots are skipped. */
  hasOptions?: boolean;
};

/**
 * Resolve library group ids + waive flag for an archetype given café recipes
 * and the café's modifier library (by stable group name).
 */
export function resolveArchetypeGroups(
  archetypeId: DrinkArchetypeId,
  cafeConfig: CafeDrinkArchetypeConfig | null | undefined,
  libraryByName: Map<string, LibraryGroupRef>,
  opts?: { slotFilter?: ReadonlySet<DrinkArchetypeSlot> | readonly DrinkArchetypeSlot[] },
): { groupIds: string[]; waiveMilkSurcharge: boolean; slots: DrinkArchetypeSlot[] } {
  const recipe = resolveCafeArchetypeRecipe(archetypeId, cafeConfig);
  const groupIds: string[] = [];
  const filter = opts?.slotFilter
    ? opts.slotFilter instanceof Set
      ? opts.slotFilter
      : new Set(opts.slotFilter)
    : null;

  for (const slot of recipe.slots) {
    if (filter && !filter.has(slot)) continue;
    const groupName = DRINK_ARCHETYPE_SLOT_GROUP_NAMES[slot];
    const group = libraryByName.get(groupName);
    if (!group) continue;
    // Skip empty optional groups (e.g. Syrups disabled / no options yet).
    if (group.hasOptions === false) continue;
    groupIds.push(group.id);
  }

  return {
    groupIds,
    waiveMilkSurcharge: waiveMilkSurchargeFromCharge(recipe.milkCharge),
    slots: recipe.slots,
  };
}

export function parseCafeDrinkArchetypeConfig(raw: unknown): CafeDrinkArchetypeConfig {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: CafeDrinkArchetypeConfig = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isDrinkArchetypeId(key)) continue;
    if (value == null || typeof value !== 'object' || Array.isArray(value)) continue;
    const entry = value as Record<string, unknown>;
    const override: CafeDrinkArchetypeConfig[DrinkArchetypeId] = {};
    if (Array.isArray(entry.slots)) {
      override.slots = entry.slots.filter(isDrinkArchetypeSlot);
    }
    if (
      entry.milkCharge === 'none' ||
      entry.milkCharge === 'waived' ||
      entry.milkCharge === 'standard'
    ) {
      override.milkCharge = entry.milkCharge;
    }
    out[key] = override;
  }
  return out;
}

/** Build a name→group map from café library rows. */
export function libraryByNameFromGroups(
  groups: Array<{ id: string; name: string; options?: unknown }>,
): Map<string, LibraryGroupRef> {
  const map = new Map<string, LibraryGroupRef>();
  for (const g of groups) {
    const hasOptions = !Array.isArray(g.options) || g.options.length > 0;
    map.set(g.name, { id: g.id, name: g.name, hasOptions });
  }
  return map;
}
