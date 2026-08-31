import type { DrinkArchetypeId } from '@moonshot/domain';

export type OwnerRecipeTemplateId =
  | 'hot-coffee'
  | 'cold-coffee'
  | 'hot-other'
  | 'cold-other'
  | 'empty';

export type OwnerRecipeTemplate = {
  id: OwnerRecipeTemplateId;
  label: string;
  archetypeId: DrinkArchetypeId;
};

/** Owner-facing recipe templates — map onto a subset of backend drink archetypes. */
export const OWNER_RECIPE_TEMPLATES: readonly OwnerRecipeTemplate[] = [
  { id: 'hot-coffee', label: 'Hot coffee', archetypeId: 'milk-forward-hot' },
  { id: 'cold-coffee', label: 'Cold coffee', archetypeId: 'milk-forward-iced' },
  { id: 'hot-other', label: 'Hot Other', archetypeId: 'non-coffee-milk-hot' },
  { id: 'cold-other', label: 'Cold other', archetypeId: 'non-coffee-milk-iced' },
  { id: 'empty', label: 'Empty', archetypeId: 'tea' },
] as const;

const BY_ID = new Map(OWNER_RECIPE_TEMPLATES.map((t) => [t.id, t]));

/** Map a stored archetype (including low-milk / espresso) to the nearest owner template. */
export function ownerTemplateFromArchetype(
  archetype: string | null | undefined,
): OwnerRecipeTemplateId {
  switch (archetype) {
    case 'milk-forward-hot':
    case 'low-milk-hot':
    case 'espresso-neat':
      return 'hot-coffee';
    case 'milk-forward-iced':
    case 'low-milk-iced':
      return 'cold-coffee';
    case 'non-coffee-milk-hot':
      return 'hot-other';
    case 'non-coffee-milk-iced':
      return 'cold-other';
    case 'tea':
    case null:
    case undefined:
      return 'empty';
    default:
      return 'empty';
  }
}

export function archetypeIdForOwnerTemplate(id: OwnerRecipeTemplateId): DrinkArchetypeId {
  return BY_ID.get(id)!.archetypeId;
}

export function ownerTemplateLabel(id: OwnerRecipeTemplateId): string {
  return BY_ID.get(id)!.label;
}

/** Owner-facing label for a stored archetype, or null when none. */
export function ownerTemplateLabelForArchetype(
  archetype: string | null | undefined,
): string | null {
  if (archetype == null) return null;
  return ownerTemplateLabel(ownerTemplateFromArchetype(archetype));
}
