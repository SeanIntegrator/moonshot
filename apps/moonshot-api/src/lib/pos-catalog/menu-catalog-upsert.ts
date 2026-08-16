/**
 * POS-agnostic catalogue upsert into Postgres.
 * Square / Lightspeed adapters produce a PosCatalog; this module writes it.
 *
 * Ownership:
 * - POS owns: items, prices, sizes, categories, POS modifier lists, images, availability
 * - Moonshot owns: Flow prep attachments only when menu_items.archetype is explicitly set
 */

import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { ApiErrorCode, type MenuSectionKind, type NormalisedMenuItem } from '@moonshot/types';
import { platformDrinkArchetypeConfig, type MenuProvisionResult, type ModifierRoleHint, type PosCatalog, type PosCatalogModifierGroup, type PosCatalogSection } from '@moonshot/domain';
import { parseCafeDrinkArchetypeConfig } from '../drink-archetype-resolve.js';
import { MenuProvisionError } from '../menu/menu-provisioners/errors.js';
import { setMenuItemModifierGroups } from '../menu/menu-modifier-library.js';
import { readMenuImageStorageConfig } from '../menu/menu-image-storage.js';
import {
  parseExistingMenuItemImageState,
  resolvePosCatalogItemImage,
} from './menu-item-default-image.js';

export type CatalogUpsertMode = 'onboarding' | 'sync';

export type CatalogUpsertResult = {
  upsertedItems: number;
  softDeletedItems: number;
  upsertedGroups: number;
  /** Onboarding-shaped aliases. */
  itemCount: number;
  groupCount: number;
  milksGroupId: string | null;
  syrupsGroupId: string | null;
};

/**
 * Upsert a POS catalogue. Onboarding mode rejects non-empty menus and empty catalogues.
 * Sync mode upserts deltas and soft-deletes deletedPosItemIds.
 */
export async function upsertPosCatalog(
  client: PoolClient,
  cafeId: string,
  catalog: PosCatalog,
  mode: CatalogUpsertMode,
): Promise<CatalogUpsertResult> {
  if (mode === 'onboarding') {
    const existingMenu = await client.query<{ id: string }>(
      `SELECT id FROM menu_items WHERE cafe_id = $1 AND is_available = TRUE LIMIT 1`,
      [cafeId],
    );
    if (existingMenu.rows.length > 0) {
      throw new MenuProvisionError(
        'Menu already has items — use the dashboard menu editor to make changes',
        409,
        ApiErrorCode.CONFLICT,
      );
    }
    if (catalog.items.length === 0) {
      throw new MenuProvisionError(
        'POS catalogue has no sellable items to import',
        400,
        ApiErrorCode.VALIDATION,
      );
    }
  }

  await upsertPosSections(client, cafeId, catalog.sections);
  await seedArchetypeConfigIfEmpty(client, cafeId);

  const dbGroupIdByPosId = new Map<string, string>();
  let milksGroupId: string | null = null;
  let syrupsGroupId: string | null = null;
  let sortOrder = 0;

  for (const [posGroupId, group] of catalog.groupsByPosId) {
    const dbId = await upsertModifierGroup(client, cafeId, group, sortOrder++);
    dbGroupIdByPosId.set(posGroupId, dbId);
    if (group.role === 'milk') milksGroupId = dbId;
    if (group.role === 'syrup') syrupsGroupId = dbId;
  }

  const { rows: maxSortRows } = await client.query<{ max: number | null }>(
    `SELECT MAX(sort_order) AS max FROM menu_items WHERE cafe_id = $1`,
    [cafeId],
  );
  let itemSort = (maxSortRows[0]?.max ?? -1) + 1;

  let upsertedItems = 0;
  for (const item of catalog.items) {
    if (!item.posItemId) continue;
    await upsertCatalogItem(client, {
      cafeId,
      item,
      itemSort: itemSort++,
      dbGroupIdByPosId,
      mode,
    });
    upsertedItems += 1;
  }

  let softDeletedItems = 0;
  if (mode === 'sync' && catalog.deletedPosItemIds.length > 0) {
    const { rowCount } = await client.query(
      `UPDATE menu_items
       SET is_available = FALSE, synced_at = NOW()
       WHERE cafe_id = $1 AND pos_item_id = ANY($2::text[])`,
      [cafeId, catalog.deletedPosItemIds],
    );
    softDeletedItems = rowCount ?? 0;
  }

  if (mode === 'onboarding') {
    await reconcileOrphanSeededGroups(client, cafeId, catalog.groupsByPosId);
  }

  await syncKdsModifierClassification(client, cafeId, catalog.groupsByPosId);
  await syncFoodSectionKeys(client, cafeId);

  return {
    upsertedItems,
    softDeletedItems,
    upsertedGroups: catalog.groupsByPosId.size,
    itemCount: upsertedItems,
    groupCount: catalog.groupsByPosId.size,
    milksGroupId,
    syrupsGroupId,
  };
}

/** Onboarding-shaped result for MenuProvisionResult callers. */
export function toMenuProvisionResult(r: CatalogUpsertResult): MenuProvisionResult {
  return {
    itemCount: r.itemCount,
    groupCount: r.groupCount,
    milksGroupId: r.milksGroupId,
    syrupsGroupId: r.syrupsGroupId,
  };
}

async function seedArchetypeConfigIfEmpty(client: PoolClient, cafeId: string): Promise<void> {
  await client.query(
    `UPDATE cafes
     SET drink_archetype_config = $1::jsonb
     WHERE id = $2
       AND (drink_archetype_config = '{}'::jsonb OR drink_archetype_config IS NULL)`,
    [JSON.stringify(platformDrinkArchetypeConfig()), cafeId],
  );
  // Touch parse path so invalid JSON surfaces early (no-op otherwise).
  const { rows } = await client.query<{ drink_archetype_config: unknown }>(
    `SELECT drink_archetype_config FROM cafes WHERE id = $1`,
    [cafeId],
  );
  parseCafeDrinkArchetypeConfig(rows[0]?.drink_archetype_config ?? {});
}

/**
 * Upsert POS sections by pos_category_id (preferred) or key.
 * Does not overwrite admin-edited `kind` once set for an existing row.
 * Does not call ensureSystemMenuSections — POS cafés own their registry.
 */
export async function upsertPosSections(
  client: PoolClient,
  cafeId: string,
  sections: PosCatalogSection[],
): Promise<void> {
  // First pass: insert/update without parent_id (parents may not exist yet).
  const idByKey = new Map<string, string>();

  for (const section of sections) {
    let rowId: string | null = null;

    if (section.posCategoryId) {
      const byPos = await client.query<{ id: string; key: string }>(
        `SELECT id, key FROM menu_sections WHERE cafe_id = $1 AND pos_category_id = $2 LIMIT 1`,
        [cafeId, section.posCategoryId],
      );
      if (byPos.rows[0]) {
        rowId = byPos.rows[0].id;
        // Keep existing key (rename-stable); update label/enabled/sort/pos id.
        await client.query(
          `UPDATE menu_sections
           SET label = $1, enabled = $2, sort_order = $3, pos_category_id = $4, updated_at = NOW()
           WHERE id = $5 AND cafe_id = $6`,
          [
            section.label,
            section.enabled,
            section.sortOrder,
            section.posCategoryId,
            rowId,
            cafeId,
          ],
        );
        idByKey.set(byPos.rows[0].key, rowId);
        idByKey.set(section.key, rowId);
        continue;
      }
    }

    const byKey = await client.query<{ id: string }>(
      `SELECT id FROM menu_sections WHERE cafe_id = $1 AND key = $2 LIMIT 1`,
      [cafeId, section.key],
    );
    if (byKey.rows[0]) {
      rowId = byKey.rows[0].id;
      await client.query(
        `UPDATE menu_sections
         SET label = $1, enabled = $2, sort_order = $3,
             pos_category_id = COALESCE($4, pos_category_id),
             updated_at = NOW()
         WHERE id = $5 AND cafe_id = $6`,
        [
          section.label,
          section.enabled,
          section.sortOrder,
          section.posCategoryId,
          rowId,
          cafeId,
        ],
      );
    } else {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO menu_sections (
           cafe_id, key, label, enabled, is_system, sort_order, pos_category_id, kind
         ) VALUES ($1, $2, $3, $4, FALSE, $5, $6, $7)
         RETURNING id`,
        [
          cafeId,
          section.key,
          section.label,
          section.enabled,
          section.sortOrder,
          section.posCategoryId,
          section.kind,
        ],
      );
      rowId = inserted.rows[0]!.id;
    }
    idByKey.set(section.key, rowId!);
  }

  // Second pass: wire parent_id from parentKey.
  for (const section of sections) {
    const childId = idByKey.get(section.key);
    if (!childId) continue;
    const parentId = section.parentKey ? (idByKey.get(section.parentKey) ?? null) : null;
    await client.query(
      `UPDATE menu_sections SET parent_id = $1, updated_at = NOW() WHERE id = $2 AND cafe_id = $3`,
      [parentId, childId, cafeId],
    );
  }
}

export async function upsertModifierGroup(
  client: PoolClient,
  cafeId: string,
  group: PosCatalogModifierGroup,
  sortOrder: number,
): Promise<string> {
  const byPos = await client.query<{ id: string }>(
    `SELECT id FROM modifier_groups WHERE cafe_id = $1 AND pos_group_id = $2 LIMIT 1`,
    [cafeId, group.posGroupId],
  );
  if (byPos.rows[0]) {
    await client.query(
      `UPDATE modifier_groups
       SET name = $1, selection_type = $2, required = $3, max_select = $4,
           options = $5::jsonb, sort_order = $6, updated_at = NOW()
       WHERE id = $7 AND cafe_id = $8`,
      [
        group.name,
        group.selectionType,
        group.required,
        group.maxSelect ?? null,
        JSON.stringify(group.options),
        sortOrder,
        byPos.rows[0].id,
        cafeId,
      ],
    );
    return byPos.rows[0].id;
  }

  // Claim a seeded group with the same name and no pos_group_id (avoid unique collision).
  const byName = await client.query<{ id: string; pos_group_id: string | null }>(
    `SELECT id, pos_group_id FROM modifier_groups WHERE cafe_id = $1 AND name = $2 LIMIT 1`,
    [cafeId, group.name],
  );
  if (byName.rows[0] && byName.rows[0].pos_group_id == null) {
    await client.query(
      `UPDATE modifier_groups
       SET pos_group_id = $1, selection_type = $2, required = $3, max_select = $4,
           options = $5::jsonb, sort_order = $6, updated_at = NOW()
       WHERE id = $7 AND cafe_id = $8`,
      [
        group.posGroupId,
        group.selectionType,
        group.required,
        group.maxSelect ?? null,
        JSON.stringify(group.options),
        sortOrder,
        byName.rows[0].id,
        cafeId,
      ],
    );
    return byName.rows[0].id;
  }

  const id = randomUUID();
  await client.query(
    `INSERT INTO modifier_groups (
       id, cafe_id, name, selection_type, required, max_select, options, sort_order, pos_group_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)`,
    [
      id,
      cafeId,
      group.name,
      group.selectionType,
      group.required,
      group.maxSelect ?? null,
      JSON.stringify(group.options),
      sortOrder,
      group.posGroupId,
    ],
  );
  return id;
}

async function upsertCatalogItem(
  client: PoolClient,
  args: {
    cafeId: string;
    item: NormalisedMenuItem;
    itemSort: number;
    dbGroupIdByPosId: Map<string, string>;
    mode: CatalogUpsertMode;
  },
): Promise<'created' | 'updated'> {
  const { cafeId, item } = args;
  const existing = await client.query<{
    id: string;
    archetype: string | null;
    image_url: string | null;
    image_source: string | null;
    use_default_image: boolean;
  }>(
    `SELECT id, archetype, image_url, image_source, use_default_image
     FROM menu_items WHERE cafe_id = $1 AND pos_item_id = $2 LIMIT 1`,
    [cafeId, item.posItemId],
  );

  const squareGroupIds: string[] = [];
  for (const g of item.modifierGroups) {
    const dbId = args.dbGroupIdByPosId.get(g.id);
    if (dbId) squareGroupIds.push(dbId);
  }

  const publicBaseUrl = readMenuImageStorageConfig()?.publicBaseUrl ?? null;
  const existingRow = existing.rows[0] ?? null;
  const image = resolvePosCatalogItemImage({
    posImageUrl: item.imageUrl,
    itemName: item.name,
    existing: existingRow ? parseExistingMenuItemImageState(existingRow) : null,
    publicBaseUrl,
  });

  if (existingRow) {
    const menuItemId = existingRow.id;
    const hasArchetype = existingRow.archetype != null;

    if (image.writeImage) {
      await client.query(
        `UPDATE menu_items SET
           name = $1, description = $2, price_minor = $3, currency = $4,
           category = $5, subcategory = $6, sizes = $7::jsonb,
           image_url = $8, image_source = $9, is_available = $10, synced_at = NOW()
         WHERE id = $11 AND cafe_id = $12`,
        [
          item.name,
          item.description,
          item.priceMinor,
          item.currency || 'GBP',
          item.category,
          item.subcategory,
          JSON.stringify(item.sizes),
          image.imageUrl,
          image.imageSource,
          item.isAvailable !== false,
          menuItemId,
          cafeId,
        ],
      );
    } else {
      await client.query(
        `UPDATE menu_items SET
           name = $1, description = $2, price_minor = $3, currency = $4,
           category = $5, subcategory = $6, sizes = $7::jsonb,
           is_available = $8, synced_at = NOW()
         WHERE id = $9 AND cafe_id = $10`,
        [
          item.name,
          item.description,
          item.priceMinor,
          item.currency || 'GBP',
          item.category,
          item.subcategory,
          JSON.stringify(item.sizes),
          item.isAvailable !== false,
          menuItemId,
          cafeId,
        ],
      );
    }

    // Preserve Moonshot-only attachments only when admin assigned an archetype.
    let attachedIds = [...squareGroupIds];
    if (hasArchetype) {
      const { rows: attached } = await client.query<{
        modifier_group_id: string;
        pos_group_id: string | null;
      }>(
        `SELECT mig.modifier_group_id, mg.pos_group_id
         FROM menu_item_modifier_groups mig
         JOIN modifier_groups mg ON mg.id = mig.modifier_group_id
         WHERE mig.menu_item_id = $1`,
        [menuItemId],
      );
      const prepIds = attached
        .filter((r) => r.pos_group_id == null)
        .map((r) => r.modifier_group_id);
      attachedIds = [
        ...squareGroupIds,
        ...prepIds.filter((id) => !squareGroupIds.includes(id)),
      ];
    }
    await setMenuItemModifierGroups(client, menuItemId, attachedIds);
    return 'updated';
  }

  // New item — Square groups only. Prep is opt-in via admin drink types.
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO menu_items (
       cafe_id, pos_item_id, name, description, price_minor, currency, category, subcategory,
       image_url, image_source, use_default_image, is_available, tags, modifier_groups, sizes, sort_order,
       archetype, waive_milk_surcharge, allow_no_milk, synced_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8,
       $9, $10, TRUE, $11, $12::text[], '[]'::jsonb, $13::jsonb, $14,
       NULL, FALSE, FALSE, NOW()
     )
     RETURNING id`,
    [
      cafeId,
      item.posItemId,
      item.name,
      item.description,
      item.priceMinor,
      item.currency || 'GBP',
      item.category,
      item.subcategory,
      image.imageUrl,
      image.imageSource,
      item.isAvailable !== false,
      item.tags,
      JSON.stringify(item.sizes),
      args.itemSort,
    ],
  );

  await setMenuItemModifierGroups(client, rows[0]!.id, squareGroupIds);
  return 'created';
}

/**
 * Drop signup-seeded Milks/Syrups that were never claimed by a POS list
 * and have no item attachments.
 */
async function reconcileOrphanSeededGroups(
  client: PoolClient,
  cafeId: string,
  groupsByPosId: Map<string, PosCatalogModifierGroup>,
): Promise<void> {
  const roles = [...groupsByPosId.values()].map((g) => g.role);
  const namesToMaybeDrop: string[] = [];
  if (roles.includes('milk')) namesToMaybeDrop.push('Milks');
  if (roles.includes('syrup')) namesToMaybeDrop.push('Syrups');
  if (namesToMaybeDrop.length === 0) return;

  for (const name of namesToMaybeDrop) {
    await client.query(
      `DELETE FROM modifier_groups g
       WHERE g.cafe_id = $1
         AND g.name = $2
         AND g.pos_group_id IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM menu_item_modifier_groups m WHERE m.modifier_group_id = g.id
         )`,
      [cafeId, name],
    );
  }
}

/** Append POS list names into café KDS classification so chips still resolve. */
export async function syncKdsModifierClassification(
  client: PoolClient,
  cafeId: string,
  groupsByPosId: Map<string, PosCatalogModifierGroup>,
): Promise<void> {
  const coffeeModifiers: string[] = [];
  const additions: string[] = [];

  for (const group of groupsByPosId.values()) {
    if (group.role === 'milk') coffeeModifiers.push(group.name);
    else if (group.role === 'syrup' || group.role === 'topping') additions.push(group.name);
  }

  if (coffeeModifiers.length === 0 && additions.length === 0) return;

  const { rows } = await client.query<{ kds_config: Record<string, unknown> }>(
    `SELECT kds_config FROM cafes WHERE id = $1`,
    [cafeId],
  );
  const kds = { ...(rows[0]?.kds_config ?? {}) } as Record<string, unknown>;
  const mc = {
    ...((kds.modifierClassification as Record<string, unknown> | undefined) ?? {}),
  };

  const mergeUnique = (existing: unknown, extra: string[]): string[] => {
    const base = Array.isArray(existing)
      ? existing.filter((x): x is string => typeof x === 'string')
      : [];
    return [...new Set([...base, ...extra])];
  };

  if (coffeeModifiers.length > 0) {
    mc.coffeeModifiers = mergeUnique(mc.coffeeModifiers, coffeeModifiers);
  }
  if (additions.length > 0) {
    mc.additions = mergeUnique(mc.additions, additions);
  }

  kds.modifierClassification = mc;
  await client.query(`UPDATE cafes SET kds_config = $1::jsonb WHERE id = $2`, [
    JSON.stringify(kds),
    cafeId,
  ]);
}

/**
 * Mirror menu_sections into kds_config section key lists (food + drink),
 * ordered by sort_order so the KDS board can group lines by section.
 */
export async function syncFoodSectionKeys(
  client: { query: PoolClient['query'] },
  cafeId: string,
): Promise<void> {
  const { rows } = await client.query<{ key: string; kind: string }>(
    `SELECT key, kind FROM menu_sections
     WHERE cafe_id = $1
     ORDER BY sort_order, label`,
    [cafeId],
  );
  const foodKeys = rows.filter((r) => r.kind === 'food').map((r) => r.key);
  const drinkKeys = rows.filter((r) => r.kind === 'drink').map((r) => r.key);
  const { rows: cafeRows } = await client.query<{ kds_config: Record<string, unknown> }>(
    `SELECT kds_config FROM cafes WHERE id = $1`,
    [cafeId],
  );
  const kds = { ...(cafeRows[0]?.kds_config ?? {}) };
  kds.foodSectionKeys = foodKeys.length > 0 ? foodKeys : ['food'];
  kds.drinkSectionKeys = drinkKeys;
  await client.query(`UPDATE cafes SET kds_config = $1::jsonb WHERE id = $2`, [
    JSON.stringify(kds),
    cafeId,
  ]);
}

/** Load existing pos_category_id → key map for rename-stable normalisation. */
export async function loadExistingPosCategoryKeys(
  client: PoolClient,
  cafeId: string,
): Promise<Map<string, string>> {
  const { rows } = await client.query<{ pos_category_id: string; key: string }>(
    `SELECT pos_category_id, key FROM menu_sections
     WHERE cafe_id = $1 AND pos_category_id IS NOT NULL`,
    [cafeId],
  );
  return new Map(rows.map((r) => [r.pos_category_id, r.key]));
}

export type { MenuSectionKind, ModifierRoleHint };
