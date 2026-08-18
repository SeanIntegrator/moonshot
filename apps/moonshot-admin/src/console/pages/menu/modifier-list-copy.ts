import type { CafeModifierGroup, ModifierSelectionType } from '@moonshot/types';

export {
  catalogGroupsForPos,
  isPosCatalogCafe,
  isPosOwnedGroup,
} from '@moonshot/domain';

export function customersPickLabel(selectionType: ModifierSelectionType): string {
  return selectionType === 'single' ? 'Just one' : 'Any number';
}

export function choiceMetaLine(group: Pick<CafeModifierGroup, 'selectionType' | 'required'>): string {
  return `${group.selectionType === 'single' ? 'Pick one' : 'Any number'}${
    group.required ? ' · required' : ''
  }`;
}

export function defaultCellLabel(isDefault: boolean): string {
  return isDefault ? 'Yes' : '—';
}
