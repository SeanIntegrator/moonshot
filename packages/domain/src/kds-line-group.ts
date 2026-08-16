/**
 * KDS board line consolidation + sort.
 *
 * Identical lines (same item, modifiers, notes, allergens) merge into one row
 * with summed quantity. Drinks then sort by menu section → beans → milk →
 * other modifiers so baristas can scan coconut milks / whole milks as blocks.
 */

import type { KdsConfig, NormalisedOrderItem, NormalisedOrderLineModifier } from '@moonshot/types';
import {
  deriveFlowLine,
  modifierGroupMatches,
  resolveClassification,
  type FlowLineView,
  type KdsResolvedClassification,
} from './kds.js';

export interface GroupedKdsLine {
  /** Representative line (first merged source); quantity is the sum. */
  item: NormalisedOrderItem;
  view: FlowLineView;
  /** Original order_item ids — crossing-out / ready status still key off these. */
  sourceIds: string[];
  quantity: number;
}

function allergensKey(allergens: string[]): string {
  return [...allergens].map((a) => a.trim().toLowerCase()).sort().join('\0');
}

function modifiersIdentityKey(modifiers: NormalisedOrderLineModifier[]): string {
  return [...modifiers]
    .map((m) => `${m.groupId}\0${m.optionId}`)
    .sort()
    .join('|');
}

/** Stable fingerprint for "exactly the same" lines (merge candidates). */
export function kdsLineIdentityKey(item: NormalisedOrderItem): string {
  const menuKey = item.menuItemId?.trim() || `name:${item.itemName.trim().toLowerCase()}`;
  const category = (item.category ?? '').trim().toLowerCase();
  const notes = (item.notes ?? '').trim();
  return [
    menuKey,
    category,
    notes,
    allergensKey(item.allergens ?? []),
    modifiersIdentityKey(item.modifiers ?? []),
  ].join('::');
}

function sectionRank(category: string | null | undefined, orderedKeys: readonly string[]): number {
  if (typeof category !== 'string' || !category.trim()) return Number.MAX_SAFE_INTEGER - 1;
  const idx = orderedKeys.indexOf(category);
  if (idx >= 0) return idx;
  // Unknown keys after known ones — alpha among unknowns via secondary key.
  return Number.MAX_SAFE_INTEGER - 1;
}

function firstMatchingMod(
  modifiers: NormalisedOrderLineModifier[],
  names: readonly string[],
): NormalisedOrderLineModifier | null {
  for (const mod of modifiers) {
    if (mod.isSize) continue;
    if (modifierGroupMatches(mod.groupName, names)) return mod;
  }
  return null;
}

function optionSortKey(mod: NormalisedOrderLineModifier | null): string {
  if (!mod) return '';
  return (mod.optionName || mod.optionId || '').trim().toLowerCase();
}

/** Syrups / extras / unclassified non-role modifiers for tertiary sort. */
function otherModifiersSortKey(
  modifiers: NormalisedOrderLineModifier[],
  classification: KdsResolvedClassification,
): string {
  const others: string[] = [];
  for (const mod of modifiers) {
    if (mod.isSize) continue;
    if (modifierGroupMatches(mod.groupName, classification.coffeeModifiers)) continue;
    if (modifierGroupMatches(mod.groupName, classification.shots)) continue;
    if (modifierGroupMatches(mod.groupName, classification.beans)) continue;
    if (modifierGroupMatches(mod.groupName, classification.milkTemperature)) continue;
    if (modifierGroupMatches(mod.groupName, classification.milkTexture)) continue;
    if (modifierGroupMatches(mod.groupName, classification.iceLevel)) continue;
    // Additions + unclassified (syrups, toppings, etc.).
    others.push(`${mod.groupName.trim().toLowerCase()}\0${mod.optionName.trim().toLowerCase()}`);
  }
  return others.sort().join('|');
}

function drinkSortTuple(
  item: NormalisedOrderItem,
  index: number,
  config: KdsConfig,
  classification: KdsResolvedClassification,
): [number, string, string, string, string, string, number] {
  const drinkKeys = config.drinkSectionKeys ?? [];
  const category = item.category ?? '';
  const bean = firstMatchingMod(item.modifiers, classification.beans);
  const milk = firstMatchingMod(item.modifiers, classification.coffeeModifiers);
  return [
    sectionRank(category, drinkKeys),
    category.trim().toLowerCase(),
    optionSortKey(bean),
    optionSortKey(milk),
    otherModifiersSortKey(item.modifiers, classification),
    item.itemName.trim().toLowerCase(),
    index,
  ];
}

function foodSortTuple(
  item: NormalisedOrderItem,
  index: number,
  config: KdsConfig,
): [number, string, string, number] {
  const foodKeys = config.foodSectionKeys ?? [];
  const category = item.category ?? '';
  return [
    sectionRank(category, foodKeys),
    category.trim().toLowerCase(),
    item.itemName.trim().toLowerCase(),
    index,
  ];
}

function compareTuples(a: readonly (string | number)[], b: readonly (string | number)[]): number {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const av = a[i]!;
    const bv = b[i]!;
    if (typeof av === 'number' && typeof bv === 'number') {
      if (av !== bv) return av - bv;
    } else {
      const cmp = String(av).localeCompare(String(bv));
      if (cmp !== 0) return cmp;
    }
  }
  return a.length - b.length;
}

/**
 * Merge identical lines then sort drinks (section → beans → milk → other) and
 * food (section → name). Returns rows ready for DrinkRow / FoodRow.
 *
 * @param options.partitionKey — Extra bucket key so identical catalogue lines can
 *   stay separate (e.g. made vs open after a partial recall). Without this,
 *   pre-crossed and remake duplicates collapse into one row whose toggle would
 *   clear the crossed ids.
 */
export function groupKdsLines(
  items: readonly NormalisedOrderItem[],
  config: KdsConfig,
  options?: { partitionKey?: (item: NormalisedOrderItem) => string },
): GroupedKdsLine[] {
  const classification = resolveClassification(config);
  const partitionKey = options?.partitionKey;

  const buckets = new Map<
    string,
    { firstIndex: number; items: NormalisedOrderItem[] }
  >();
  const bucketOrder: string[] = [];

  items.forEach((item, index) => {
    const part = partitionKey ? partitionKey(item) : '';
    const key = part ? `${kdsLineIdentityKey(item)}::p:${part}` : kdsLineIdentityKey(item);
    const existing = buckets.get(key);
    if (existing) {
      existing.items.push(item);
      return;
    }
    buckets.set(key, { firstIndex: index, items: [item] });
    bucketOrder.push(key);
  });

  const merged = bucketOrder.map((key) => {
    const bucket = buckets.get(key)!;
    const first = bucket.items[0]!;
    const quantity = bucket.items.reduce((sum, it) => sum + it.quantity, 0);
    return {
      item: { ...first, quantity },
      sourceIds: bucket.items.map((it) => it.id),
      quantity,
      firstIndex: bucket.firstIndex,
    };
  });

  const withViews = merged.map((m) => ({
    ...m,
    view: deriveFlowLine(m.item, config),
  }));

  const drinks = withViews.filter((m) => !m.view.isFood);
  const foods = withViews.filter((m) => m.view.isFood);

  drinks.sort((a, b) =>
    compareTuples(
      drinkSortTuple(a.item, a.firstIndex, config, classification),
      drinkSortTuple(b.item, b.firstIndex, config, classification),
    ),
  );
  foods.sort((a, b) =>
    compareTuples(
      foodSortTuple(a.item, a.firstIndex, config),
      foodSortTuple(b.item, b.firstIndex, config),
    ),
  );

  return [...drinks, ...foods].map((m) => ({
    item: m.item,
    view: m.view,
    sourceIds: m.sourceIds,
    quantity: m.quantity,
  }));
}
