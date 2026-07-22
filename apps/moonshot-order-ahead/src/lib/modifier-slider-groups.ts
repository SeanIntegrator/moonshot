import type { NormalisedModifierGroup, NormalisedModifierOption } from '@moonshot/types';

/** Groups rendered as stepped sliders inside "Additional customisation". */
export const ADDITIONAL_CUSTOMISATION_GROUP_NAMES = [
  'Shots',
  'Milk Temperature',
  'Milk Texture',
] as const;

export type AdditionalCustomisationGroupName =
  (typeof ADDITIONAL_CUSTOMISATION_GROUP_NAMES)[number];

/**
 * Preferred left→right option order for slider continua.
 * Unknown options (café custom) append after known ones, preserving API order among themselves.
 */
const SLIDER_OPTION_ORDER: Record<AdditionalCustomisationGroupName, readonly string[]> = {
  Shots: ['Single', 'Double', 'Triple', 'Quad'],
  // Warm is the cool end of the continuum; Hot (default) sits next.
  'Milk Temperature': ['Warm', 'Hot', 'Extra Hot', 'Extra Extra Hot'],
  'Milk Texture': ['Wet', 'Standard', 'Dry', 'Extra Foam'],
};

export function isAdditionalCustomisationGroup(
  name: string,
): name is AdditionalCustomisationGroupName {
  return (ADDITIONAL_CUSTOMISATION_GROUP_NAMES as readonly string[]).includes(name);
}

export function sortOptionsForSlider(
  groupName: string,
  options: NormalisedModifierOption[],
): NormalisedModifierOption[] {
  const preferred = isAdditionalCustomisationGroup(groupName)
    ? SLIDER_OPTION_ORDER[groupName]
    : null;
  if (!preferred) return options;

  const rank = new Map(preferred.map((name, i) => [name.toLowerCase(), i]));
  return [...options].sort((a, b) => {
    const ai = rank.get(a.name.toLowerCase());
    const bi = rank.get(b.name.toLowerCase());
    if (ai != null && bi != null) return ai - bi;
    if (ai != null) return -1;
    if (bi != null) return 1;
    return 0;
  });
}

/**
 * Split item modifiers into primary grids vs accordion sliders.
 * Beans is promoted ahead of the accordion when both Beans and Shots exist,
 * so the three sliders sit together at the end.
 */
export function partitionModifierGroups(groups: NormalisedModifierGroup[]): {
  primary: NormalisedModifierGroup[];
  additional: NormalisedModifierGroup[];
} {
  const additionalByName = new Map<string, NormalisedModifierGroup>();
  const primary: NormalisedModifierGroup[] = [];

  for (const g of groups) {
    if (isAdditionalCustomisationGroup(g.name)) {
      additionalByName.set(g.name, g);
    } else {
      primary.push(g);
    }
  }

  const additional = ADDITIONAL_CUSTOMISATION_GROUP_NAMES.map((name) =>
    additionalByName.get(name),
  ).filter((g): g is NormalisedModifierGroup => g != null);

  return { primary, additional };
}
