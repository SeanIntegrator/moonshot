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
  /** Items directly on this section (when it has no children, or leaf-only). */
  items: NormalisedMenuItem[];
  /** Child subsections when the café uses a two-level Square hierarchy. */
  children?: MenuSectionChild[];
};

/**
 * Group available items by café section registry.
 * Top-level sections (no parentKey) become nav tabs; their children become sub-headings.
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
      const children: MenuSectionChild[] = kids
        .map((c) => ({
          category: c.key,
          label: c.label,
          items: byCat.get(c.key) ?? [],
        }))
        .filter((c) => c.items.length > 0);
      const ownItems = byCat.get(parent.key) ?? [];
      if (children.length === 0 && ownItems.length === 0) continue;
      result.push({
        category: parent.key,
        label: parent.label,
        items: ownItems,
        children: children.length > 0 ? children : undefined,
      });
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

  // Orphan / stranded leaves: parent missing, disabled, or skipped because it had
  // nothing to show. Only skip if the parent actually rendered (we're already a child).
  const shown = new Set(
    result.flatMap((r) => [r.category, ...(r.children?.map((c) => c.category) ?? [])]),
  );
  for (const s of sorted) {
    if (shown.has(s.key)) continue;
    if (s.parentKey && shown.has(s.parentKey)) continue;
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
