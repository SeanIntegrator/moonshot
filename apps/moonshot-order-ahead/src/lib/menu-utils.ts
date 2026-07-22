import type { CafeMenuSection, NormalisedMenu, NormalisedMenuItem } from '@moonshot/types';

const FALLBACK_LABELS: Record<string, string> = {
  hot_drinks: 'Espresso',
  cold_drinks: 'Cold',
  food: 'Food',
  extras: 'Extras',
};

export function categoryDisplayName(category: string, sections?: CafeMenuSection[]): string {
  const fromRegistry = sections?.find((s) => s.key === category)?.label;
  if (fromRegistry) return fromRegistry;
  return FALLBACK_LABELS[category] ?? category.replace(/_/g, ' ');
}

export type MenuSection = {
  category: string;
  label: string;
  items: NormalisedMenuItem[];
};

/**
 * Group available items by café section registry (sort_order).
 * Skips disabled sections and empty sections for the customer menu.
 */
export function groupMenuByCategory(menu: NormalisedMenu): MenuSection[] {
  const byCat = new Map<string, NormalisedMenuItem[]>();
  for (const item of menu.items) {
    if (!item.isAvailable) continue;
    const list = byCat.get(item.category) ?? [];
    list.push(item);
    byCat.set(item.category, list);
  }

  const sections = menu.sections ?? [];
  if (sections.length > 0) {
    return sections
      .filter((s) => s.enabled)
      .map((s) => ({
        category: s.key,
        label: s.label,
        items: byCat.get(s.key) ?? [],
      }))
      .filter((s) => s.items.length > 0);
  }

  // Legacy menus without a sections payload — preserve previous order.
  const order = ['hot_drinks', 'cold_drinks', 'food', 'extras'];
  const keys = [...byCat.keys()].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return keys.map((category) => ({
    category,
    label: categoryDisplayName(category),
    items: byCat.get(category)!,
  }));
}

export function featuredItems(menu: NormalisedMenu): NormalisedMenuItem[] {
  return menu.items.filter((i) => i.isAvailable && i.tags.some((t) => t.toLowerCase() === 'featured'));
}
