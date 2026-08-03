import type {
  MenuCategory,
  MenuItemImageSource,
  NormalisedItemSize,
  NormalisedMenuItem,
  NormalisedModifierGroup,
} from '@moonshot/types';
import { NO_MILK_OPTION_ID } from '@moonshot/types';

export const SIZE_MODIFIER_GROUP_ID = '__item_size__';

export type MenuItemRow = {
  id: string;
  pos_item_id: string | null;
  name: string;
  description: string | null;
  price_minor: number;
  currency: string;
  category: string;
  subcategory: string | null;
  image_url: string | null;
  image_source: string | null;
  use_default_image: boolean;
  emoji: string | null;
  is_available: boolean;
  tags: string[];
  modifier_groups: unknown;
  sizes: unknown;
  archetype: string | null;
  waive_milk_surcharge: boolean;
  allow_no_milk: boolean;
};

export type ModifierGroupRow = {
  id: string;
  name: string;
  selection_type: string;
  required: boolean;
  max_select: number | null;
  options: unknown;
  sort_order: number;
};

function parseSizes(raw: unknown): NormalisedItemSize[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is Record<string, unknown> => s != null && typeof s === 'object')
    .map((s) => ({
      id: String(s.id ?? ''),
      name: String(s.name ?? ''),
      priceMinor: typeof s.priceMinor === 'number' ? s.priceMinor : Number(s.price_minor) || 0,
      isDefault: s.isDefault === true,
      colorHex: typeof s.colorHex === 'string' ? s.colorHex : null,
      chipLabel: typeof s.chipLabel === 'string' ? s.chipLabel : null,
    }))
    .filter((s) => s.id && s.name);
}

function parseModifierGroupFromJson(g: Record<string, unknown>): NormalisedModifierGroup | null {
  const id = typeof g.id === 'string' ? g.id : '';
  const name = typeof g.name === 'string' ? g.name : '';
  if (!id || !name) return null;
  const selectionType = g.selectionType === 'multi' ? 'multi' : 'single';
  const options = Array.isArray(g.options)
    ? g.options
        .filter((o): o is Record<string, unknown> => o != null && typeof o === 'object')
        .map((o) => ({
          id: String(o.id ?? ''),
          posOptionId: typeof o.posOptionId === 'string' ? o.posOptionId : null,
          name: String(o.name ?? ''),
          priceMinor: typeof o.priceMinor === 'number' ? o.priceMinor : 0,
          isDefault: o.isDefault === true,
          colorHex: typeof o.colorHex === 'string' ? o.colorHex : null,
          chipLabel: typeof o.chipLabel === 'string' ? o.chipLabel : null,
        }))
        .filter((o) => o.id && o.name)
    : [];
  return {
    id,
    name,
    selectionType,
    required: g.required === true,
    maxSelect: typeof g.maxSelect === 'number' ? g.maxSelect : null,
    options,
  };
}

export function mapModifierGroupRow(row: ModifierGroupRow): NormalisedModifierGroup {
  const fromJson = parseModifierGroupFromJson({
    id: row.id,
    name: row.name,
    selectionType: row.selection_type,
    required: row.required,
    maxSelect: row.max_select,
    options: row.options,
  });
  return (
    fromJson ?? {
      id: row.id,
      name: row.name,
      selectionType: 'single',
      required: false,
      options: [],
    }
  );
}

function parseEmbeddedGroups(raw: unknown): NormalisedModifierGroup[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((g): g is Record<string, unknown> => g != null && typeof g === 'object')
    .map(parseModifierGroupFromJson)
    .filter((g): g is NormalisedModifierGroup => g != null);
}

/** Merge library groups (ordered) with legacy embedded groups; library wins on id collision. */
export function mergeModifierGroups(
  library: NormalisedModifierGroup[],
  embedded: NormalisedModifierGroup[],
): NormalisedModifierGroup[] {
  const byId = new Map<string, NormalisedModifierGroup>();
  for (const g of embedded) byId.set(g.id, g);
  for (const g of library) byId.set(g.id, g);
  const orderedIds = [
    ...library.map((g) => g.id),
    ...embedded.map((g) => g.id).filter((id) => !library.some((l) => l.id === id)),
  ];
  return orderedIds
    .map((id) => byId.get(id))
    .filter((g): g is NormalisedModifierGroup => g != null);
}

/** Zero Milks option prices when the item waives alt-milk surcharge. */
export function applyMilkSurchargeWaiver(
  groups: NormalisedModifierGroup[],
  waiveMilkSurcharge: boolean,
): NormalisedModifierGroup[] {
  if (!waiveMilkSurcharge) return groups;
  return groups.map((g) => {
    if (g.name !== 'Milks' && g.name !== 'Milk') return g;
    return {
      ...g,
      options: g.options.map((o) => ({ ...o, priceMinor: 0 })),
    };
  });
}

/**
 * When allowNoMilk is set, inject a synthetic “No milk” option (default)
 * so black americano / tea can be ordered without picking a milk type.
 */
export function applyAllowNoMilk(
  groups: NormalisedModifierGroup[],
  allowNoMilk: boolean,
): NormalisedModifierGroup[] {
  if (!allowNoMilk) return groups;
  return groups.map((g) => {
    if (g.name !== 'Milks' && g.name !== 'Milk') return g;
    const withoutSynthetic = g.options.filter((o) => o.id !== NO_MILK_OPTION_ID);
    const alreadyHasNamed = withoutSynthetic.some(
      (o) => o.name.trim().toLowerCase() === 'no milk',
    );
    const options = alreadyHasNamed
      ? withoutSynthetic.map((o) =>
          o.name.trim().toLowerCase() === 'no milk'
            ? { ...o, isDefault: true, priceMinor: 0 }
            : { ...o, isDefault: false },
        )
      : [
          {
            id: NO_MILK_OPTION_ID,
            posOptionId: null,
            name: 'No milk',
            priceMinor: 0,
            isDefault: true,
            colorHex: null,
            chipLabel: null,
          },
          ...withoutSynthetic.map((o) => ({ ...o, isDefault: false })),
        ];
    return { ...g, options };
  });
}

export function mapMenuItemRow(
  row: MenuItemRow,
  attachedGroups: NormalisedModifierGroup[] = [],
): NormalisedMenuItem {
  const embedded = parseEmbeddedGroups(row.modifier_groups);
  const merged = mergeModifierGroups(attachedGroups, embedded);
  const waiveMilkSurcharge = row.waive_milk_surcharge === true;
  const allowNoMilk = row.allow_no_milk === true;
  const groups = applyAllowNoMilk(
    applyMilkSurchargeWaiver(merged, waiveMilkSurcharge),
    allowNoMilk,
  );

  const rawSource = row.image_source;
  const imageSource: MenuItemImageSource | null =
    rawSource === 'pos' || rawSource === 'upload' || rawSource === 'template'
      ? rawSource
      : null;

  return {
    id: row.id,
    posItemId: row.pos_item_id,
    name: row.name,
    description: row.description,
    priceMinor: row.price_minor,
    currency: row.currency,
    category: row.category as MenuCategory,
    subcategory: row.subcategory,
    imageUrl: row.image_url,
    imageSource,
    useDefaultImage: row.use_default_image !== false,
    emoji: row.emoji,
    isAvailable: row.is_available,
    sizes: parseSizes(row.sizes),
    modifierGroups: groups,
    tags: row.tags ?? [],
    archetype: row.archetype ?? null,
    waiveMilkSurcharge,
    allowNoMilk,
  };
}

export function minSizePriceMinor(sizes: NormalisedItemSize[]): number | null {
  if (sizes.length === 0) return null;
  return Math.min(...sizes.map((s) => s.priceMinor));
}
