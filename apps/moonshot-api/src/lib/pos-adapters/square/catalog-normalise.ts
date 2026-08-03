/**
 * Pure Square Catalog → PosCatalog mapping. No DB / HTTP.
 * Hierarchy and modifier fidelity live here; upsert is POS-agnostic.
 */

import { randomUUID } from 'node:crypto';
import type { CatalogObject } from 'square';
import type { NormalisedItemSize, NormalisedMenuItem, NormalisedModifierGroup, NormalisedModifierOption } from '@moonshot/types';
import type { PosCatalog, PosCatalogModifierGroup, ModifierRoleHint } from '@moonshot/domain';
import { chipMetaForOptionName } from '../../menu/menu-chip-palette.js';
import type { SquareCatalogSnapshot } from './catalog-fetch.js';
import {
  buildCatalogSections,
  resolveItemCategoryPlacement,
} from './catalog-categories.js';
import { buildRoleHintMap, classifyModifierListRole } from './role-hints.js';

export type CatalogNormaliseResult = PosCatalog;

export type CatalogNormaliseOptions = {
  /** When true, include deleted/archived items as `isAvailable: false`. */
  includeDeletedItems?: boolean;
  /** Existing pos_category_id → section key map (rename-stable keys). */
  existingKeyByPosCategoryId?: Map<string, string>;
};

/** @deprecated Use PosCatalogModifierGroup from @moonshot/types. */
export type ImportModifierGroup = PosCatalogModifierGroup;

function moneyToMinor(amount: bigint | number | null | undefined): number {
  if (amount == null) return 0;
  const n = typeof amount === 'bigint' ? Number(amount) : amount;
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function stripHtml(html: string | null | undefined): string | null {
  if (!html?.trim()) return null;
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || null;
}

function normaliseModifierList(
  list: CatalogObject.ModifierList,
  role: ModifierRoleHint,
): PosCatalogModifierGroup | null {
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
    role,
  };
}

/**
 * Pure Square Catalog → PosCatalog. Internal UUIDs are generated here;
 * persist upserts by pos_* ids.
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

  const groupsByPosId = new Map<string, PosCatalogModifierGroup>();
  for (const list of snapshot.modifierLists) {
    if (list.isDeleted) continue;
    const role =
      roleHints.get(list.id) ?? classifyModifierListRole(list.modifierListData?.name ?? '');
    const group = normaliseModifierList(list, role);
    if (!group) continue;
    groupsByPosId.set(list.id, group);
  }

  const { sections, keyByPosCategoryId } = buildCatalogSections(
    snapshot.categories,
    options.existingKeyByPosCategoryId ?? new Map(),
  );

  // Ensure uncategorised fallback exists when any item lacks a category.
  const usedKeys = new Set<string>();
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

    const placement = resolveItemCategoryPlacement(data, keyByPosCategoryId);
    usedKeys.add(placement.sectionKey);

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

    // Honour Square's per-item modifier list order (ordinal) and enablement.
    const listInfos = [...(data?.modifierListInfo ?? [])].sort((a, b) => {
      const ao = a.ordinal ?? 0;
      const bo = b.ordinal ?? 0;
      return ao - bo;
    });

    const itemGroups: NormalisedModifierGroup[] = [];
    for (const info of listInfos) {
      if (info.enabled === false) continue;
      const base = groupsByPosId.get(info.modifierListId);
      if (!base) continue;

      // Per-item hidden override: skip entire list when forced hidden.
      if (info.hiddenFromCustomerOverride === 'YES') continue;

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
      category: placement.sectionKey,
      subcategory: null,
      imageUrl,
      imageSource: null,
      useDefaultImage: true,
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

  // Drop unused sections; keep parents that still have used children.
  const childKeysByParent = new Map<string, string[]>();
  for (const s of sections) {
    if (!s.parentKey) continue;
    const list = childKeysByParent.get(s.parentKey) ?? [];
    list.push(s.key);
    childKeysByParent.set(s.parentKey, list);
  }

  const enabledSections = sections.filter((s) => {
    if (usedKeys.has(s.key)) return true;
    const children = childKeysByParent.get(s.key) ?? [];
    return children.some((k) => usedKeys.has(k));
  });

  // If any item fell into uncategorised and that key isn't in the tree, add it.
  if (usedKeys.has('uncategorised') && !enabledSections.some((s) => s.key === 'uncategorised')) {
    enabledSections.push({
      key: 'uncategorised',
      label: 'Uncategorised',
      parentKey: null,
      posCategoryId: null,
      kind: 'drink',
      enabled: true,
      sortOrder: enabledSections.length,
    });
  }

  return {
    cafeId,
    sections: enabledSections,
    items,
    groupsByPosId,
    deletedPosItemIds,
    fetchedAt: new Date().toISOString(),
  };
}
