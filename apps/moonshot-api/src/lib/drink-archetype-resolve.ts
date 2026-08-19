import { DRINK_ARCHETYPE_SLOT_GROUP_NAMES, type CafeDrinkArchetypeConfig, type DrinkArchetypeId, type DrinkArchetypeSlot, isDrinkArchetypeId, isDrinkArchetypeSlot, resolveCafeArchetypeRecipe, waiveMilkSurchargeFromCharge } from '@moonshot/domain';
import type { ModifierSlot } from '@moonshot/types';

export type LibraryGroupRef = {
  id: string;
  name: string;
  slot?: ModifierSlot;
  /** When false/empty, syrup (and similar) slots are skipped. */
  hasOptions?: boolean;
};

/**
 * Resolve library group ids + waive flag for an archetype given café recipes
 * and the café's modifier library (by slot, then stable group name).
 */
export function resolveArchetypeGroups(
  archetypeId: DrinkArchetypeId,
  cafeConfig: CafeDrinkArchetypeConfig | null | undefined,
  libraryByName: Map<string, LibraryGroupRef>,
  opts?: {
    slotFilter?: ReadonlySet<DrinkArchetypeSlot> | readonly DrinkArchetypeSlot[];
    libraryBySlot?: Map<DrinkArchetypeSlot, LibraryGroupRef>;
  },
): { groupIds: string[]; waiveMilkSurcharge: boolean; slots: DrinkArchetypeSlot[] } {
  const recipe = resolveCafeArchetypeRecipe(archetypeId, cafeConfig);
  const groupIds: string[] = [];
  const filter = opts?.slotFilter
    ? opts.slotFilter instanceof Set
      ? opts.slotFilter
      : new Set(opts.slotFilter)
    : null;
  const bySlot = opts?.libraryBySlot ?? libraryBySlotFromGroups([...libraryByName.values()]);

  for (const slot of recipe.slots) {
    if (filter && !filter.has(slot)) continue;
    const groupName = DRINK_ARCHETYPE_SLOT_GROUP_NAMES[slot];
    const group = bySlot.get(slot) ?? libraryByName.get(groupName);
    if (!group) continue;
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

function groupHasOptions(g: { options?: unknown; hasOptions?: boolean }): boolean {
  if (typeof g.hasOptions === 'boolean') return g.hasOptions;
  return !Array.isArray(g.options) || g.options.length > 0;
}

/** Build a name→group map from café library rows. */
export function libraryByNameFromGroups(
  groups: Array<{ id: string; name: string; options?: unknown; slot?: ModifierSlot }>,
): Map<string, LibraryGroupRef> {
  const map = new Map<string, LibraryGroupRef>();
  for (const g of groups) {
    map.set(g.name, {
      id: g.id,
      name: g.name,
      slot: g.slot,
      hasOptions: groupHasOptions(g),
    });
  }
  return map;
}

/** Build a slot→group map from café library rows (preferred for archetype attach). */
export function libraryBySlotFromGroups(
  groups: Array<{ id: string; name: string; options?: unknown; slot?: ModifierSlot; hasOptions?: boolean }>,
): Map<DrinkArchetypeSlot, LibraryGroupRef> {
  const map = new Map<DrinkArchetypeSlot, LibraryGroupRef>();
  for (const g of groups) {
    if (!isDrinkArchetypeSlot(g.slot)) continue;
    map.set(g.slot, {
      id: g.id,
      name: g.name,
      slot: g.slot,
      hasOptions: groupHasOptions(g),
    });
  }
  return map;
}
