import type { CafeModifierGroup, NormalisedModifierOption } from '@moonshot/types';

export function updateOption(
  group: CafeModifierGroup,
  optionId: string,
  patch: Partial<NormalisedModifierOption>,
): CafeModifierGroup {
  return {
    ...group,
    options: group.options.map((o) => (o.id === optionId ? { ...o, ...patch } : o)),
  };
}

export function setDefault(group: CafeModifierGroup, optionId: string, on: boolean): CafeModifierGroup {
  if (group.selectionType === 'single') {
    return {
      ...group,
      options: group.options.map((o) => ({ ...o, isDefault: o.id === optionId })),
    };
  }
  return updateOption(group, optionId, { isDefault: on });
}

export function removeOption(group: CafeModifierGroup, optionId: string): CafeModifierGroup {
  if (group.options.length <= 1) return group;
  return { ...group, options: group.options.filter((o) => o.id !== optionId) };
}
