import { randomUUID } from 'node:crypto';
import type { CatalogObject } from 'square';
import type {
  CafeMenuSection,
  NormalisedItemSize,
  NormalisedMenu,
  NormalisedMenuItem,
  NormalisedModifierGroup,
  NormalisedModifierOption,
} from '@moonshot/types';
import { SYSTEM_MENU_SECTION_KEYS, SYSTEM_MENU_SECTION_LABELS } from '@moonshot/types';
import { chipMetaForOptionName } from '../../menu-chip-palette.js';
import { slugifyMenuSectionKey } from '../../menu-sections.js';
import type { SquareCatalogSnapshot } from './catalog-fetch.js';
import { buildRoleHintMap, classifyModifierListRole, type ModifierRoleHint } from './role-hints.js';

/** Import-time group: Square list id carried alongside NormalisedModifierGroup. */
export type ImportModifierGroup = NormalisedModifierGroup & { posGroupId: string };

export type CatalogNormaliseResult = {
  menu: NormalisedMenu;
  /** Groups keyed by Square MODIFIER_LIST id. */
  groupsByPosId: Map<string, ImportModifierGroup>;
  /** posGroupId → role for KDS sync + chip palette. */
  roleHints: Map<string, ModifierRoleHint>;
  /** Square item ids marked deleted/archived in this snapshot (for soft-delete). */
  deletedPosItemIds: string[];
};

export type CatalogNormaliseOptions = {
  /** When true, include deleted/archived items as `isAvailable: false`. */
  includeDeletedItems?: boolean;
};

function moneyToMinor(amount: bigint | number | null | undefined): number {
  if (amount == null) return 0;
  const n = typeof amount === 'bigint' ? Number(amount) : amount;
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function stripHtml(html: string | null | undefined): string | null {
  if (!html?.trim()) return null;
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || null;
}

/** Map Square category name onto a system section key when possible. */
export function mapCategoryToSectionKey(categoryName: string): string {
  const slug = slugifyMenuSectionKey(categoryName);
  const n = categoryName.trim().toLowerCase();

  if (
    slug === 'hot_drinks' ||
    n.includes('hot drink') ||
    n === 'hot drinks' ||
    n === 'coffee' ||
    n === 'hot'
  ) {
    return 'hot_drinks';
  }
  if (
    slug === 'cold_drinks' ||
    n.includes('cold drink') ||
    n.includes('iced') ||
    n === 'cold'
  ) {
    return 'cold_drinks';
  }
  if (slug === 'food' || n.includes('food') || n.includes('pastr') || n.includes('bakery')) {
    return 'food';
  }
  return slug || 'other';
}

function buildSections(
  cafeId: string,
  categories: CatalogObject.Category[],
  usedKeys: Set<string>,
): CafeMenuSection[] {
  const sections: CafeMenuSection[] = [];
  const seenKeys = new Set<string>();

  for (const key of SYSTEM_MENU_SECTION_KEYS) {
    sections.push({
      id: randomUUID(),
      cafeId,
      key,
      label: SYSTEM_MENU_SECTION_LABELS[key],
      enabled: usedKeys.has(key) || key !== 'food',
      isSystem: true,
      sortOrder: sections.length,
    });
    seenKeys.add(key);
  }

  for (const cat of categories) {
    const name = cat.categoryData?.name?.trim();
    if (!name) continue;
    const key = mapCategoryToSectionKey(name);
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    usedKeys.add(key);
    sections.push({
      id: randomUUID(),
      cafeId,
      key,
      label: name,
      enabled: true,
      isSystem: false,
      sortOrder: sections.length,
    });
  }

  if (usedKeys.has('food')) {
    const food = sections.find((s) => s.key === 'food');
    if (food) food.enabled = true;
  }

  return sections;
}

function normaliseModifierList(
  list: CatalogObject.ModifierList,
  role: ModifierRoleHint,
): ImportModifierGroup | null {
  const data = list.modifierListData;
  if (!data) return null;
  if (data.modifierType === 'TEXT') return null;

  const name = data.name?.trim();
  if (!name) return null;

  const maxSel =
    data.maxSelectedModifiers != null && Number(data.maxSelectedModifiers) > 0
      ? Number(data.maxSelectedModifiers)
      : null;
  const minSel =
    data.minSelectedModifiers != null && Number(data.minSelectedModifiers) > 0
      ? Number(data.minSelectedModifiers)
      : 0;

  const selectionType: 'single' | 'multi' =
    data.selectionType === 'MULTIPLE' || (maxSel != null && maxSel > 1) ? 'multi' : 'single';

  const chipRole = role === 'milk' || role === 'syrup' ? role : 'other';
  const options: NormalisedModifierOption[] = [];
  for (const modObj of data.modifiers ?? []) {
    if (modObj.type !== 'MODIFIER' || modObj.isDeleted) continue;
    const mod = modObj.modifierData;
    if (!mod?.name?.trim()) continue;
    const chip = chipMetaForOptionName(mod.name, chipRole);
    options.push({
      id: randomUUID(),
      posOptionId: modObj.id,
      name: mod.name.trim(),
      priceMinor: moneyToMinor(mod.priceMoney?.amount),
      isDefault: mod.onByDefault === true,
      colorHex: chip.colorHex,
      chipLabel: chip.chipLabel,
    });
  }

  if (options.length === 0) return null;

  if (selectionType === 'single' && minSel > 0 && !options.some((o) => o.isDefault)) {
    options[0]!.isDefault = true;
  }

  return {
    id: randomUUID(),
    posGroupId: list.id,
    name,
    selectionType,
    required: minSel > 0,
    maxSelect: selectionType === 'multi' ? maxSel : null,
    options,
  };
}

/**
 * Pure Square Catalog → NormalisedMenu mapping. No DB / HTTP.
 * Internal UUIDs are generated here; persist upserts by pos_* ids.
 */
export function normaliseSquareCatalog(
  cafeId: string,
  snapshot: SquareCatalogSnapshot,
  options: CatalogNormaliseOptions = {},
): CatalogNormaliseResult {
  const includeDeletedItems = options.includeDeletedItems === true;

  const imageUrlById = new Map<string, string>();
  for (const img of snapshot.images ?? []) {
    if (!img.id || img.isDeleted) continue;
    const url = img.imageData?.url?.trim();
    if (url) imageUrlById.set(img.id, url);
  }

  const listMeta = snapshot.modifierLists.map((l) => ({
    posGroupId: l.id,
    name: l.modifierListData?.name?.trim() ?? '',
  }));
  const roleHints = buildRoleHintMap(listMeta);

  const groupsByPosId = new Map<string, ImportModifierGroup>();
  for (const list of snapshot.modifierLists) {
    if (list.isDeleted) continue;
    const role =
      roleHints.get(list.id) ?? classifyModifierListRole(list.modifierListData?.name ?? '');
    const group = normaliseModifierList(list, role);
    if (!group) continue;
    groupsByPosId.set(list.id, group);
  }

  const categoryNameById = new Map<string, string>();
  for (const cat of snapshot.categories) {
    if (cat.isDeleted) continue;
    const name = cat.categoryData?.name?.trim();
    if (name && cat.id) categoryNameById.set(cat.id, name);
  }

  const usedSectionKeys = new Set<string>();
  const items: NormalisedMenuItem[] = [];
  const deletedPosItemIds: string[] = [];

  for (const itemObj of snapshot.items) {
    const data = itemObj.itemData;
    const name = data?.name?.trim();
    const isGone = Boolean(itemObj.isDeleted || data?.isArchived);

    if (isGone) {
      if (itemObj.id) deletedPosItemIds.push(itemObj.id);
      if (!includeDeletedItems || !name || !itemObj.id) continue;
    } else if (!data || !name) {
      continue;
    }

    let categoryKey = 'hot_drinks';
    const catRefs = data?.categories ?? [];
    const firstCatId =
      catRefs[0] && typeof catRefs[0] === 'object' && 'id' in catRefs[0]
        ? (catRefs[0] as { id?: string }).id
        : (data?.categoryId ?? undefined);
    if (firstCatId && categoryNameById.has(firstCatId)) {
      categoryKey = mapCategoryToSectionKey(categoryNameById.get(firstCatId)!);
    } else if (data?.categoryId && categoryNameById.has(data.categoryId)) {
      categoryKey = mapCategoryToSectionKey(categoryNameById.get(data.categoryId)!);
    }
    usedSectionKeys.add(categoryKey);

    const variationObjs = (data?.variations ?? []).filter(
      (v): v is CatalogObject.ItemVariation => v.type === 'ITEM_VARIATION' && !v.isDeleted,
    );
    const sizes: NormalisedItemSize[] = [];
    let priceMinor = 0;
    let currency = 'GBP';

    if (variationObjs.length <= 1) {
      const v = variationObjs[0]?.itemVariationData;
      priceMinor = moneyToMinor(v?.priceMoney?.amount);
      currency = v?.priceMoney?.currency ?? 'GBP';
    } else {
      for (let i = 0; i < variationObjs.length; i++) {
        const vObj = variationObjs[i]!;
        const v = vObj.itemVariationData;
        const sizeName = v?.name?.trim() || `Size ${i + 1}`;
        const sizePrice = moneyToMinor(v?.priceMoney?.amount);
        if (i === 0) {
          priceMinor = sizePrice;
          currency = v?.priceMoney?.currency ?? 'GBP';
        }
        sizes.push({
          id: randomUUID(),
          name: sizeName,
          priceMinor: sizePrice,
          isDefault: i === 0,
          colorHex: null,
          chipLabel: sizeName.slice(0, 2),
        });
      }
    }

    const itemGroups: NormalisedModifierGroup[] = [];
    for (const info of data?.modifierListInfo ?? []) {
      if (info.enabled === false) continue;
      const base = groupsByPosId.get(info.modifierListId);
      if (!base) continue;

      const minSel =
        info.minSelectedModifiers != null && info.minSelectedModifiers > 0
          ? info.minSelectedModifiers
          : base.required
            ? 1
            : 0;
      const maxSel =
        info.maxSelectedModifiers != null && info.maxSelectedModifiers > 0
          ? info.maxSelectedModifiers
          : (base.maxSelect ?? null);

      const options = base.options.map((o) => {
        const override = (info.modifierOverrides ?? []).find(
          (ov) => ov.modifierId === o.posOptionId,
        );
        if (!override) return { ...o };
        if (override.onByDefault === true || override.onByDefaultOverride === 'YES') {
          return { ...o, isDefault: true };
        }
        if (override.onByDefault === false || override.onByDefaultOverride === 'NO') {
          return { ...o, isDefault: false };
        }
        return { ...o };
      });

      itemGroups.push({
        // Persist matches groups by this Square list id (via groupsByPosId).
        id: base.posGroupId,
        name: base.name,
        selectionType: maxSel != null && maxSel > 1 ? 'multi' : base.selectionType,
        required: minSel > 0,
        maxSelect: maxSel != null && maxSel > 1 ? maxSel : null,
        options,
      });
    }

    const imageIds = data?.imageIds ?? [];
    let imageUrl: string | null = null;
    for (const imageId of imageIds) {
      const url = imageUrlById.get(imageId);
      if (url) {
        imageUrl = url;
        break;
      }
    }

    items.push({
      id: randomUUID(),
      posItemId: itemObj.id,
      name,
      description: stripHtml(data?.descriptionPlaintext ?? data?.description),
      priceMinor,
      currency,
      category: categoryKey,
      subcategory: null,
      imageUrl,
      emoji: null,
      isAvailable: !isGone,
      sizes,
      modifierGroups: itemGroups,
      tags: [],
      archetype: null,
      waiveMilkSurcharge: false,
      allowNoMilk: false,
    });
  }

  return {
    menu: {
      cafeId,
      items,
      sections: buildSections(cafeId, snapshot.categories, usedSectionKeys),
      fetchedAt: new Date().toISOString(),
    },
    groupsByPosId,
    roleHints,
    deletedPosItemIds,
  };
}
