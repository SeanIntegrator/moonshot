import type { CafeModifierGroup, NormalisedModifierOption } from '@moonshot/types';

export function hasDefaultOption(group: CafeModifierGroup): boolean {
  return group.options.some((o) => o.isDefault);
}

export function groupHasValidDefaults(group: CafeModifierGroup): boolean {
  return !group.required || hasDefaultOption(group);
}

/** When required is on, at least one option must be default. */
export function ensureDefaultOption(group: CafeModifierGroup): CafeModifierGroup {
  if (!group.required || hasDefaultOption(group) || group.options.length === 0) {
    return group;
  }
  const first = group.options[0]!;
  if (group.selectionType === 'single') {
    return {
      ...group,
      options: group.options.map((o) => ({ ...o, isDefault: o.id === first.id })),
    };
  }
  return updateOption(group, first.id, { isDefault: true });
}

export function setRequired(group: CafeModifierGroup, required: boolean): CafeModifierGroup {
  const next = { ...group, required };
  return required ? ensureDefaultOption(next) : next;
}

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
    if (!on) {
      if (group.required) return group;
      return updateOption(group, optionId, { isDefault: false });
    }
    return {
      ...group,
      options: group.options.map((o) => ({ ...o, isDefault: o.id === optionId })),
    };
  }
  if (!on && group.required) {
    const defaults = group.options.filter((o) => o.isDefault);
    if (defaults.length === 1 && defaults[0]?.id === optionId) {
      return group;
    }
  }
  return updateOption(group, optionId, { isDefault: on });
}

export function addOption(
  group: CafeModifierGroup,
  option: NormalisedModifierOption,
): CafeModifierGroup {
  const next = { ...group, options: [...group.options, option] };
  return ensureDefaultOption(next);
}

export function removeOption(group: CafeModifierGroup, optionId: string): CafeModifierGroup {
  if (group.options.length <= 1) return group;
  const removing = group.options.find((o) => o.id === optionId);
  const next = { ...group, options: group.options.filter((o) => o.id !== optionId) };
  if (group.required && removing?.isDefault) {
    return ensureDefaultOption(next);
  }
  return next;
}
