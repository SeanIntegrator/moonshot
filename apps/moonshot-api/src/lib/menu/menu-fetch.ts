import type { NormalisedMenu } from '@moonshot/types';
import type { Pool, PoolClient } from 'pg';
import { mapMenuItemRow, mapModifierGroupRow, type MenuItemRow, type ModifierGroupRow } from './menu-map.js';
import { ensureSystemMenuSections, listMenuSectionsForCafe } from './menu-sections.js';

type Db = Pool | PoolClient;

type AttachRow = {
  menu_item_id: string;
  sort_order: number;
  id: string;
  name: string;
  selection_type: string;
  required: boolean;
  max_select: number | null;
  options: unknown;
  group_sort_order: number;
};

/**
 * Load menu items for a café with attached library modifier groups merged into each item.
 */
export async function fetchMenuForCafe(db: Db, cafeId: string, availableOnly = true): Promise<NormalisedMenu> {
  await ensureSystemMenuSections(db, cafeId);
  const sections = await listMenuSectionsForCafe(db, cafeId);

  const availabilityClause = availableOnly ? 'AND mi.is_available = TRUE' : '';

  const { rows: itemRows } = await db.query<MenuItemRow>(
    `SELECT
      mi.id, mi.pos_item_id, mi.name, mi.description, mi.price_minor, mi.currency,
      mi.category, mi.subcategory, mi.image_url, mi.image_source, mi.use_default_image, mi.emoji, mi.is_available,
      mi.tags, mi.modifier_groups, mi.sizes, mi.archetype, mi.waive_milk_surcharge, mi.allow_no_milk
    FROM menu_items mi
    WHERE mi.cafe_id = $1 ${availabilityClause}
    ORDER BY mi.sort_order ASC, mi.name ASC`,
    [cafeId],
  );

  if (itemRows.length === 0) {
    return { cafeId, items: [], sections, fetchedAt: new Date().toISOString() };
  }

  const itemIds = itemRows.map((r) => r.id);

  const { rows: attachRows } = await db.query<AttachRow>(
    `SELECT
      mimg.menu_item_id,
      mimg.sort_order,
      mg.id,
      mg.name,
      mg.selection_type,
      mg.required,
      mg.max_select,
      mg.options,
      mg.sort_order AS group_sort_order
    FROM menu_item_modifier_groups mimg
    JOIN modifier_groups mg ON mg.id = mimg.modifier_group_id
    WHERE mimg.menu_item_id = ANY($1::uuid[])
    ORDER BY mimg.menu_item_id, mimg.sort_order ASC, mg.name ASC`,
    [itemIds],
  );

  const groupsByItem = new Map<string, ReturnType<typeof mapModifierGroupRow>[]>();
  for (const row of attachRows) {
    const groupRow: ModifierGroupRow = {
      id: row.id,
      name: row.name,
      selection_type: row.selection_type,
      required: row.required,
      max_select: row.max_select,
      options: row.options,
      sort_order: row.group_sort_order,
    };
    const list = groupsByItem.get(row.menu_item_id) ?? [];
    list.push(mapModifierGroupRow(groupRow));
    groupsByItem.set(row.menu_item_id, list);
  }

  const items = itemRows.map((r) => mapMenuItemRow(r, groupsByItem.get(r.id) ?? []));

  return {
    cafeId,
    items,
    sections,
    fetchedAt: new Date().toISOString(),
  };
}

/** Load specific menu items with merged groups (order checkout resolution). */
export async function fetchMenuItemsByIds(
  db: Db,
  cafeId: string,
  itemIds: string[],
): Promise<Map<string, ReturnType<typeof mapMenuItemRow>>> {
  if (itemIds.length === 0) return new Map();

  const { rows: itemRows } = await db.query<MenuItemRow>(
    `SELECT
      mi.id, mi.pos_item_id, mi.name, mi.description, mi.price_minor, mi.currency,
      mi.category, mi.subcategory, mi.image_url, mi.image_source, mi.use_default_image, mi.emoji, mi.is_available,
      mi.tags, mi.modifier_groups, mi.sizes, mi.archetype, mi.waive_milk_surcharge, mi.allow_no_milk
    FROM menu_items mi
    WHERE mi.cafe_id = $1 AND mi.id = ANY($2::uuid[]) AND mi.is_available = TRUE`,
    [cafeId, itemIds],
  );

  const { rows: attachRows } = await db.query<AttachRow>(
    `SELECT
      mimg.menu_item_id,
      mimg.sort_order,
      mg.id,
      mg.name,
      mg.selection_type,
      mg.required,
      mg.max_select,
      mg.options,
      mg.sort_order AS group_sort_order
    FROM menu_item_modifier_groups mimg
    JOIN modifier_groups mg ON mg.id = mimg.modifier_group_id
    WHERE mimg.menu_item_id = ANY($1::uuid[])
    ORDER BY mimg.menu_item_id, mimg.sort_order ASC`,
    [itemIds],
  );

  const groupsByItem = new Map<string, ReturnType<typeof mapModifierGroupRow>[]>();
  for (const row of attachRows) {
    const groupRow: ModifierGroupRow = {
      id: row.id,
      name: row.name,
      selection_type: row.selection_type,
      required: row.required,
      max_select: row.max_select,
      options: row.options,
      sort_order: row.group_sort_order,
    };
    const list = groupsByItem.get(row.menu_item_id) ?? [];
    list.push(mapModifierGroupRow(groupRow));
    groupsByItem.set(row.menu_item_id, list);
  }

  const out = new Map<string, ReturnType<typeof mapMenuItemRow>>();
  for (const r of itemRows) {
    out.set(r.id, mapMenuItemRow(r, groupsByItem.get(r.id) ?? []));
  }
  return out;
}
