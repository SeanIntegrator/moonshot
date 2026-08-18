import type { CafeModifierGroup, NormalisedMenuItem } from '@moonshot/types';
import type { DrinkArchetypeDef, DrinkArchetypeId } from '@moonshot/domain';
import { defaultAllowNoMilk, DRINK_ARCHETYPE_SLOT_GROUP_NAMES } from '@moonshot/domain';

export type DraftItem = NormalisedMenuItem & { attachedGroupIds: string[] };

export function toDraft(item: NormalisedMenuItem, library: CafeModifierGroup[]): DraftItem {
  const libraryIds = new Set(library.map((g) => g.id));
  return {
    ...structuredClone(item),
    sizes: item.sizes ?? [],
    archetype: item.archetype ?? null,
    waiveMilkSurcharge: item.waiveMilkSurcharge ?? false,
    allowNoMilk: item.allowNoMilk ?? false,
    attachedGroupIds: item.modifierGroups.filter((g) => libraryIds.has(g.id)).map((g) => g.id),
  };
}

export function emptyDraft(defaultCategory: string): DraftItem {
  return {
    id: '',
    posItemId: null,
    name: '',
    description: null,
    priceMinor: 0,
    currency: 'GBP',
    category: defaultCategory,
    subcategory: null,
    imageUrl: null,
    imageSource: null,
    useDefaultImage: true,
    emoji: null,
    isAvailable: true,
    sizes: [],
    modifierGroups: [],
    tags: [],
    archetype: null,
    waiveMilkSurcharge: false,
    allowNoMilk: false,
    attachedGroupIds: [],
  };
}

export function applyArchetypeToDraft(
  draft: DraftItem,
  archetypeId: DrinkArchetypeId | null,
  recipe: DrinkArchetypeDef | null,
  library: CafeModifierGroup[],
): DraftItem {
  if (!archetypeId || !recipe) {
    return { ...draft, archetype: null, waiveMilkSurcharge: false, allowNoMilk: false };
  }
  const byName = new Map(library.map((g) => [g.name, g]));
  const posPreserved = draft.attachedGroupIds.filter((id) => {
    const g = library.find((x) => x.id === id);
    return g?.options.some((o) => o.posOptionId != null) === true || g?.posGroupId != null;
  });
  const attachedGroupIds = [...posPreserved];
  for (const slot of recipe.slots) {
    const groupName = DRINK_ARCHETYPE_SLOT_GROUP_NAMES[slot];
    const group = byName.get(groupName);
    if (!group) continue;
    if (group.options.length === 0) continue;
    if (!attachedGroupIds.includes(group.id)) attachedGroupIds.push(group.id);
  }
  return {
    ...draft,
    archetype: archetypeId,
    waiveMilkSurcharge: recipe.milkCharge === 'waived',
    allowNoMilk: defaultAllowNoMilk(archetypeId, { name: draft.name }),
    attachedGroupIds,
  };
}

export function toggleAttachedGroup(draft: DraftItem, groupId: string): DraftItem {
  const has = draft.attachedGroupIds.includes(groupId);
  return {
    ...draft,
    attachedGroupIds: has
      ? draft.attachedGroupIds.filter((id) => id !== groupId)
      : [...draft.attachedGroupIds, groupId],
  };
}

function saveShape(draft: DraftItem) {
  return {
    name: draft.name,
    description: draft.description,
    priceMinor: draft.priceMinor,
    category: draft.category,
    subcategory: draft.subcategory,
    imageUrl: draft.imageUrl,
    sizes: draft.sizes,
    attachedGroupIds: draft.attachedGroupIds,
    archetype: draft.archetype,
    waiveMilkSurcharge: draft.waiveMilkSurcharge,
    allowNoMilk: draft.allowNoMilk,
  };
}

export function itemDraftDirty(
  draft: DraftItem,
  original: NormalisedMenuItem,
  library: CafeModifierGroup[],
): boolean {
  return JSON.stringify(saveShape(draft)) !== JSON.stringify(saveShape(toDraft(original, library)));
}
