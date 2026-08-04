import type { CafeMenuSection, NormalisedMenu, NormalisedMenuItem } from '@moonshot/types';

export function categoryDisplayName(category: string, sections?: CafeMenuSection[]): string {
  const fromRegistry = sections?.find((s) => s.key === category)?.label;
  if (fromRegistry) return fromRegistry;
  return category.replace(/_/g, ' ');
}

export type MenuSectionChild = {
  category: string;
  label: string;
  items: NormalisedMenuItem[];
};

export type MenuSection = {
  category: string;
  label: string;
  /** Items on this section (always leaf-level after grouping). */
  items: NormalisedMenuItem[];
  /**
   * @deprecated Leaf promotion made nesting unused; kept for type compatibility.
   * Prefer flat top-level sections only.
   */
  children?: MenuSectionChild[];
};

/**
 * Group available items by café section registry.
 * When a parent has subcategories, only the non-empty leaf sections are emitted
 * as top-level nav tabs / headers (e.g. Sweet, Savory — not Food).
 * Parent sections with their own direct items still appear as their own tab.
 */
export function groupMenuByCategory(menu: NormalisedMenu): MenuSection[] {
  const byCat = new Map<string, NormalisedMenuItem[]>();
  for (const item of menu.items) {
    if (!item.isAvailable) continue;
    const list = byCat.get(item.category) ?? [];
    list.push(item);
    byCat.set(item.category, list);
  }

  const sections = [...(menu.sections ?? [])].filter((s) => s.enabled);
  if (sections.length === 0) {
    return [...byCat.entries()].map(([category, items]) => ({
      category,
      label: categoryDisplayName(category),
      items,
    }));
  }

  const sorted = [...sections].sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  const topLevel = sorted.filter((s) => !s.parentKey);
  const childrenOf = new Map<string, CafeMenuSection[]>();
  for (const s of sorted) {
    if (!s.parentKey) continue;
    const list = childrenOf.get(s.parentKey) ?? [];
    list.push(s);
    childrenOf.set(s.parentKey, list);
  }

  const result: MenuSection[] = [];
  for (const parent of topLevel) {
    const kids = childrenOf.get(parent.key) ?? [];
    if (kids.length > 0) {
      // Promote non-empty leaves to top-level; hide empty container parents.
      for (const child of kids) {
        const items = byCat.get(child.key) ?? [];
        if (items.length === 0) continue;
        result.push({
          category: child.key,
          label: child.label,
          items,
        });
      }
      const ownItems = byCat.get(parent.key) ?? [];
      if (ownItems.length > 0) {
        result.push({
          category: parent.key,
          label: parent.label,
          items: ownItems,
        });
      }
    } else {
      const items = byCat.get(parent.key) ?? [];
      if (items.length === 0) continue;
      result.push({
        category: parent.key,
        label: parent.label,
        items,
      });
    }
  }

  // Orphan / stranded leaves: parent missing, disabled, or skipped.
  const shown = new Set(result.map((r) => r.category));
  for (const s of sorted) {
    if (shown.has(s.key)) continue;
    const items = byCat.get(s.key) ?? [];
    if (items.length === 0) continue;
    result.push({ category: s.key, label: s.label, items });
    shown.add(s.key);
  }

  return result;
}

export function featuredItems(menu: NormalisedMenu): NormalisedMenuItem[] {
  return menu.items.filter((i) => i.isAvailable && i.tags.some((t) => t.toLowerCase() === 'featured'));
}
