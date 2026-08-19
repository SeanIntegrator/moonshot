/**
 * Square CATEGORY → PosCatalogSection tree.
 * Mirrors parent/child hierarchy and ordinals; keys are stable across renames via posCategoryId.
 *
 * Food vs drink: exact parent labels only — `Food`, `Drink`, or `Drinks` (case/whitespace
 * normalised). No name heuristics. Children inherit from the nearest matching ancestor.
 */

import type { CatalogObject } from 'square';
import type { MenuSectionKind } from '@moonshot/types';
import type { PosCatalogSection } from '@moonshot/domain';
import { slugifyMenuSectionKey } from '../../menu/menu-sections.js';

export type CategoryPlacement = {
  /** Leaf section key for the item. */
  sectionKey: string;
  /** Square category id used for placement (null when uncategorised). */
  posCategoryId: string | null;
};

export type CatalogCategoryBuildResult = {
  sections: PosCatalogSection[];
  /** Square category id → Moonshot section key. */
  keyByPosCategoryId: Map<string, string>;
};

/** Normalise a Square category label for exact kind matching. */
export function normaliseCategoryLabel(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/**
 * Direct kind from an exact label match — null when the label is not Food/Drink(s).
 */
export function directKindFromLabel(label: string): 'food' | 'drink' | null {
  const n = normaliseCategoryLabel(label);
  if (n === 'food') return 'food';
  if (n === 'drink' || n === 'drinks') return 'drink';
  return null;
}

function categoryOrdinal(cat: CatalogObject.Category): number {
  const parent = cat.categoryData?.parentCategory;
  if (parent && typeof parent === 'object' && 'ordinal' in parent) {
    const o = (parent as { ordinal?: number | bigint | null }).ordinal;
    if (typeof o === 'bigint') return Number(o);
    if (typeof o === 'number' && Number.isFinite(o)) return o;
  }
  return 0;
}

function parentCategoryId(cat: CatalogObject.Category): string | null {
  const parent = cat.categoryData?.parentCategory;
  if (!parent || typeof parent !== 'object') return null;
  const id = (parent as { id?: string | null }).id;
  return id?.trim() || null;
}

/**
 * Allocate a unique section key from a display name, avoiding collisions
 * with already-claimed keys (including parents built earlier in the pass).
 */
function allocateKey(label: string, claimed: Set<string>): string {
  const base = slugifyMenuSectionKey(label);
  if (!claimed.has(base)) {
    claimed.add(base);
    return base;
  }
  for (let i = 2; i < 50; i++) {
    const candidate = `${base}_${i}`;
    if (!claimed.has(candidate)) {
      claimed.add(candidate);
      return candidate;
    }
  }
  const fallback = `${base}_${Date.now()}`;
  claimed.add(fallback);
  return fallback;
}

function resolveKindForPosId(
  posId: string,
  metaByPosId: Map<string, { label: string; parentPosId: string | null }>,
  directKindByPosId: Map<string, 'food' | 'drink' | null>,
): MenuSectionKind {
  let walk: string | null = posId;
  while (walk) {
    const direct = directKindByPosId.get(walk);
    if (direct === 'food' || direct === 'drink') return direct;
    const parentPosId: string | null = metaByPosId.get(walk)?.parentPosId ?? null;
    if (!parentPosId || !metaByPosId.has(parentPosId)) break;
    walk = parentPosId;
  }
  return 'unclassified';
}

/**
 * Build a two-level (parent → child) section tree from Square CATEGORY objects.
 * Existing keyByPosCategoryId (from DB) wins so renames keep the same Moonshot key.
 */
export function buildCatalogSections(
  categories: CatalogObject.Category[],
  existingKeyByPosId: Map<string, string> = new Map(),
): CatalogCategoryBuildResult {
  const live = categories.filter((c) => !c.isDeleted && c.id && c.categoryData?.name?.trim());

  // Sort parents before children, then by ordinal for stable sibling order.
  const sorted = [...live].sort((a, b) => {
    const aTop = a.categoryData?.isTopLevel === true || !parentCategoryId(a) ? 0 : 1;
    const bTop = b.categoryData?.isTopLevel === true || !parentCategoryId(b) ? 0 : 1;
    if (aTop !== bTop) return aTop - bTop;
    return categoryOrdinal(a) - categoryOrdinal(b);
  });

  const claimed = new Set<string>([...existingKeyByPosId.values()]);
  const keyByPosCategoryId = new Map<string, string>();
  const directKindByPosId = new Map<string, 'food' | 'drink' | null>();
  const metaByPosId = new Map<
    string,
    { label: string; parentPosId: string | null; sortOrder: number }
  >();

  for (const cat of sorted) {
    const id = cat.id!;
    const label = cat.categoryData!.name!.trim();
    const parentPosId = parentCategoryId(cat);
    const existing = existingKeyByPosId.get(id);
    const key = existing ?? allocateKey(label, claimed);
    keyByPosCategoryId.set(id, key);

    directKindByPosId.set(id, directKindFromLabel(label));
    metaByPosId.set(id, {
      label,
      parentPosId,
      sortOrder: categoryOrdinal(cat),
    });
  }

  const sections: PosCatalogSection[] = [];
  const posIds = [...keyByPosCategoryId.keys()];
  posIds.sort((a, b) => {
    const ma = metaByPosId.get(a)!;
    const mb = metaByPosId.get(b)!;
    const pa = ma.parentPosId ?? '';
    const pb = mb.parentPosId ?? '';
    if (pa !== pb) return pa.localeCompare(pb);
    return ma.sortOrder - mb.sortOrder;
  });

  let orderCounter = 0;
  for (const posId of posIds) {
    const meta = metaByPosId.get(posId)!;
    const key = keyByPosCategoryId.get(posId)!;
    let parentKey: string | null = null;
    if (meta.parentPosId && keyByPosCategoryId.has(meta.parentPosId)) {
      let walk: string | null = meta.parentPosId;
      let topPos = meta.parentPosId;
      while (walk) {
        const parentMeta = metaByPosId.get(walk);
        if (!parentMeta?.parentPosId || !keyByPosCategoryId.has(parentMeta.parentPosId)) {
          topPos = walk;
          break;
        }
        topPos = parentMeta.parentPosId;
        walk = parentMeta.parentPosId;
      }
      if (topPos !== posId) {
        parentKey = keyByPosCategoryId.get(topPos) ?? null;
      }
    }

    sections.push({
      key,
      label: meta.label,
      parentKey,
      posCategoryId: posId,
      kind: resolveKindForPosId(posId, metaByPosId, directKindByPosId),
      enabled: true,
      sortOrder: orderCounter++,
    });
  }

  return { sections, keyByPosCategoryId };
}

/**
 * Resolve which section an item belongs to.
 * Prefer reportingCategory → first categories[] entry → legacy categoryId.
 */
export function resolveItemCategoryPlacement(
  itemData: {
    reportingCategory?: { id?: string | null } | null;
    categories?: Array<{ id?: string | null }> | null;
    categoryId?: string | null;
  } | null | undefined,
  keyByPosCategoryId: Map<string, string>,
  fallbackKey = 'uncategorised',
): CategoryPlacement {
  const candidates: Array<string | null | undefined> = [
    itemData?.reportingCategory?.id,
    ...(itemData?.categories ?? []).map((c) => c?.id),
    itemData?.categoryId,
  ];

  for (const id of candidates) {
    if (!id) continue;
    const key = keyByPosCategoryId.get(id);
    if (key) return { sectionKey: key, posCategoryId: id };
  }

  return { sectionKey: fallbackKey, posCategoryId: null };
}
