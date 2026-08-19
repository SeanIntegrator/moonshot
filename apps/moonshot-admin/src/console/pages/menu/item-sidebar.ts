import {
  isFoodMenuCategory,
  MODIFIER_FAMILY_LABELS,
  type CafeMenuSection,
  type CafeModifierGroup,
  type ModifierFamily,
  type NormalisedMenuItem,
  type StockChipKey,
} from '@moonshot/types';
import { familyForSlot } from '@moonshot/domain';

export type ItemSidebarGroup = {
  key: string;
  label: string;
  items: NormalisedMenuItem[];
};

export function itemsBySection(
  items: NormalisedMenuItem[],
  sections: CafeMenuSection[],
  query: string,
): ItemSidebarGroup[] {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? items.filter((item) => item.name.toLowerCase().includes(q))
    : items;
  const sorted = [...sections].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label),
  );
  const groups: ItemSidebarGroup[] = [];
  const seen = new Set<string>();
  for (const section of sorted) {
    const list = filtered.filter((item) => item.category === section.key);
    if (list.length === 0) continue;
    groups.push({ key: section.key, label: section.label, items: list });
    seen.add(section.key);
  }
  const rest = filtered.filter((item) => !seen.has(item.category));
  if (rest.length > 0) {
    groups.push({ key: '_other', label: 'Other', items: rest });
  }
  return groups;
}

/** First row in sidebar order (section sort), not API array order. */
export function firstSidebarItemId(
  items: NormalisedMenuItem[],
  sections: CafeMenuSection[],
): string | null {
  return itemsBySection(items, sections, '')[0]?.items[0]?.id ?? null;
}

export function isFoodItem(item: NormalisedMenuItem, sections: CafeMenuSection[]): boolean {
  const section = sections.find((s) => s.key === item.category);
  if (section?.kind === 'food') return true;
  return isFoodMenuCategory(item.category, sections.filter((s) => s.kind === 'food').map((s) => s.key));
}

export function itemListPriceMinor(item: NormalisedMenuItem): number {
  const def = item.sizes.find((s) => s.isDefault) ?? item.sizes[0];
  return def ? def.priceMinor : item.priceMinor;
}

export function isFeaturedItem(item: NormalisedMenuItem): boolean {
  return item.tags.some((t) => t.toLowerCase() === 'featured');
}

export function offeredOnCount(items: NormalisedMenuItem[], groupId: string): number {
  return items.filter((item) => item.modifierGroups.some((g) => g.id === groupId)).length;
}

export function offeredOnLabel(count: number): string {
  if (count === 1) return 'Offered on 1 drink';
  return `Offered on ${count} drinks`;
}

export function hasUnclassifiedSections(sections: CafeMenuSection[]): boolean {
  return sections.some((s) => s.kind === 'unclassified');
}

export const MODIFIER_FAMILY_TABS: ReadonlyArray<{ value: Exclude<StockChipKey, 'food'>; label: string }> =
  (Object.entries(MODIFIER_FAMILY_LABELS) as Array<[Exclude<StockChipKey, 'food'>, string]>).map(
    ([value, label]) => ({ value, label }),
  );

export function visibleCatalogListTabs<T extends { value: Exclude<StockChipKey, 'food'> }>(
  tabs: readonly T[],
  library: CafeModifierGroup[],
  posCafe: boolean,
): T[] {
  if (!posCafe) return [...tabs];
  return tabs.filter((tab) => {
    if (tab.value === 'other') {
      return library.some((g) => familyForSlot(g.slot) === 'other');
    }
    return optionCountForFamily(library, tab.value) > 0;
  });
}

export function optionCountForFamily(
  groups: CafeModifierGroup[],
  family: ModifierFamily,
): number {
  return groups
    .filter((g) => familyForSlot(g.slot) === family)
    .reduce((n, g) => n + g.options.length, 0);
}

export function kitchenAbbrev(name: string, chipLabel?: string | null): string {
  const trimmed = (chipLabel ?? '').trim();
  if (trimmed) return trimmed.slice(0, 12);
  const letters = name.replace(/[^a-zA-Z0-9]+/g, '');
  if (letters.length >= 2) return letters.slice(0, 2);
  return letters || '—';
}
