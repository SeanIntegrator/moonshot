import type { MenuCategory, NormalisedMenu, NormalisedMenuItem } from '@moonshot/types';

const CATEGORY_ORDER: MenuCategory[] = ['hot_drinks', 'cold_drinks', 'food', 'extras'];

const CATEGORY_DISPLAY: Record<MenuCategory, string> = {
  hot_drinks: 'Espresso',
  cold_drinks: 'Cold',
  food: 'Food',
  extras: 'Extras',
};

export function categoryDisplayName(category: MenuCategory): string {
  return CATEGORY_DISPLAY[category] ?? category.replace(/_/g, ' ');
}

export type MenuSection = {
  category: MenuCategory;
  label: string;
  items: NormalisedMenuItem[];
};

/** Group menu items by category in stable display order */
export function groupMenuByCategory(menu: NormalisedMenu): MenuSection[] {
  const byCat = new Map<MenuCategory, NormalisedMenuItem[]>();
  for (const item of menu.items) {
    if (!item.isAvailable) continue;
    const list = byCat.get(item.category) ?? [];
    list.push(item);
    byCat.set(item.category, list);
  }
  return CATEGORY_ORDER.filter((c) => byCat.has(c)).map((category) => ({
    category,
    label: categoryDisplayName(category),
    items: byCat.get(category)!,
  }));
}

export function featuredItems(menu: NormalisedMenu): NormalisedMenuItem[] {
  return menu.items.filter((i) => i.isAvailable && i.tags.some((t) => t.toLowerCase() === 'featured'));
}
