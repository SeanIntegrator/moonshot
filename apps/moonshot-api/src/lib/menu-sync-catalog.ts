import type { PoolClient } from 'pg';
import {
  defaultAllowNoMilk,
  inferDrinkArchetypeFromName,
  isDrinkMenuCategory,
  platformDrinkArchetypeConfig,
  type DrinkArchetypeSlot,
  type NormalisedMenu,
  type NormalisedMenuItem,
} from '@moonshot/types';
import {
  libraryByNameFromGroups,
  parseCafeDrinkArchetypeConfig,
  resolveArchetypeGroups,
} from './drink-archetype-resolve.js';
import {
  syncKdsModifierClassification,
  upsertModifierGroup,
  type PersistCatalogOptions,
} from './menu-persist-catalog.js';
import { setMenuItemModifierGroups } from './menu-modifier-library.js';
import {
  ensureFlowPrepModifierGroups,
  ensureIceAndToppingsModifierGroups,
} from './menu-seed-library.js';
import { ensureSystemMenuSections } from './menu-sections.js';

const PREP_SLOTS: readonly DrinkArchetypeSlot[] = [
  'shots',
  'beans',
  'milk_temperature',
  'milk_texture',
  'ice_level',
  'toppings',
];

export type SyncCatalogResult = {
  upsertedItems: number;
  softDeletedItems: number;
  upsertedGroups: number;
};

export type SyncCatalogOptions = PersistCatalogOptions & {
  /** Square item ids to soft-delete (deleted/archived in this delta). */
  deletedPosItemIds?: string[];
};

/**
 * Upsert Square catalogue deltas into Postgres.
 * Square owns name/price/category/sizes/modifier lists/images/availability;
 * Moonshot Flow prep attachments are preserved on existing items.
 */
export async function syncNormalisedMenuCatalog(
  client: PoolClient,
  cafeId: string,
  menu: NormalisedMenu,
  opts: SyncCatalogOptions,
): Promise<SyncCatalogResult> {
  await ensureSystemMenuSections(client, cafeId, {
    foodEnabled: menu.items.some((i) => i.category === 'food'),
  });

  for (const section of menu.sections) {
    if (section.isSystem) continue;
    await client.query(
      `INSERT INTO menu_sections (cafe_id, key, label, enabled, is_system, sort_order)
       VALUES ($1, $2, $3, $4, FALSE, $5)
       ON CONFLICT (cafe_id, key) DO UPDATE SET
         label = EXCLUDED.label,
         enabled = EXCLUDED.enabled,
         updated_at = NOW()`,
      [cafeId, section.key, section.label, section.enabled, section.sortOrder],
    );
  }

  await client.query(
    `UPDATE cafes
     SET drink_archetype_config = $1::jsonb
     WHERE id = $2
       AND (drink_archetype_config = '{}'::jsonb OR drink_archetype_config IS NULL)`,
    [JSON.stringify(platformDrinkArchetypeConfig()), cafeId],
  );

  const { rows: configRows } = await client.query<{ drink_archetype_config: unknown }>(
    `SELECT drink_archetype_config FROM cafes WHERE id = $1`,
    [cafeId],
  );
  const cafeConfig = parseCafeDrinkArchetypeConfig(
    configRows[0]?.drink_archetype_config ?? platformDrinkArchetypeConfig(),
  );
  const effectiveConfig =
    Object.keys(cafeConfig).length === 0 ? platformDrinkArchetypeConfig() : cafeConfig;

  const dbGroupIdByPosId = new Map<string, string>();
  let sortOrder = 0;
  for (const [posGroupId, group] of opts.groupsByPosId) {
    const dbId = await upsertModifierGroup(client, cafeId, group, sortOrder++);
    dbGroupIdByPosId.set(posGroupId, dbId);
  }

  const flowGroups = await ensureFlowPrepModifierGroups(client, cafeId);
  const iceToppings = await ensureIceAndToppingsModifierGroups(client, cafeId);

  const { rows: allGroups } = await client.query<{
    id: string;
    name: string;
    options: unknown;
  }>(`SELECT id, name, options FROM modifier_groups WHERE cafe_id = $1`, [cafeId]);
  const libraryByName = libraryByNameFromGroups(allGroups);

  const { rows: maxSortRows } = await client.query<{ max: number | null }>(
    `SELECT MAX(sort_order) AS max FROM menu_items WHERE cafe_id = $1`,
    [cafeId],
  );
  let itemSort = (maxSortRows[0]?.max ?? -1) + 1;

  let upsertedItems = 0;
  for (const item of menu.items) {
    if (!item.posItemId) continue;
    const created = await upsertCatalogItem(client, {
      cafeId,
      item,
      itemSort: itemSort++,
      dbGroupIdByPosId,
      effectiveConfig,
      libraryByName,
      flowGroups,
      iceToppings,
    });
    if (created) itemSort += 0;
    upsertedItems += 1;
  }

  let softDeletedItems = 0;
  const deletedIds = opts.deletedPosItemIds ?? [];
  if (deletedIds.length > 0) {
    const { rowCount } = await client.query(
      `UPDATE menu_items
       SET is_available = FALSE, synced_at = NOW()
       WHERE cafe_id = $1 AND pos_item_id = ANY($2::text[])`,
      [cafeId, deletedIds],
    );
    softDeletedItems = rowCount ?? 0;
  }

  await syncKdsModifierClassification(client, cafeId, opts);

  return {
    upsertedItems,
    softDeletedItems,
    upsertedGroups: opts.groupsByPosId.size,
  };
}

async function upsertCatalogItem(
  client: PoolClient,
  args: {
    cafeId: string;
    item: NormalisedMenuItem;
    itemSort: number;
    dbGroupIdByPosId: Map<string, string>;
    effectiveConfig: ReturnType<typeof platformDrinkArchetypeConfig>;
    libraryByName: ReturnType<typeof libraryByNameFromGroups>;
    flowGroups: Awaited<ReturnType<typeof ensureFlowPrepModifierGroups>>;
    iceToppings: Awaited<ReturnType<typeof ensureIceAndToppingsModifierGroups>>;
  },
): Promise<'created' | 'updated'> {
  const { cafeId, item } = args;
  const existing = await client.query<{ id: string }>(
    `SELECT id FROM menu_items WHERE cafe_id = $1 AND pos_item_id = $2 LIMIT 1`,
    [cafeId, item.posItemId],
  );

  const squareGroupIds: string[] = [];
  for (const g of item.modifierGroups) {
    const dbId = args.dbGroupIdByPosId.get(g.id);
    if (dbId) squareGroupIds.push(dbId);
  }

  if (existing.rows[0]) {
    const menuItemId = existing.rows[0].id;
    // Square image overrides when present; leave Moonshot upload if Square has none.
    if (item.imageUrl) {
      await client.query(
        `UPDATE menu_items SET
           name = $1, description = $2, price_minor = $3, currency = $4,
           category = $5, subcategory = $6, sizes = $7::jsonb,
           image_url = $8, is_available = $9, synced_at = NOW()
         WHERE id = $10 AND cafe_id = $11`,
        [
          item.name,
          item.description,
          item.priceMinor,
          item.currency || 'GBP',
          item.category,
          item.subcategory,
          JSON.stringify(item.sizes),
          item.imageUrl,
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

    // Keep Moonshot-only (no pos_group_id) attachments; replace Square-linked ones.
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
    const attachedIds = [
      ...squareGroupIds,
      ...prepIds.filter((id) => !squareGroupIds.includes(id)),
    ];
    await setMenuItemModifierGroups(client, menuItemId, attachedIds);
    return 'updated';
  }

  // New item — archetype prep inference (same as onboarding insert).
  const archetypeId = isDrinkMenuCategory(item.category)
    ? inferDrinkArchetypeFromName(item.name)
    : null;

  let waiveMilkSurcharge = false;
  let allowNoMilk = false;
  let prepGroupIds: string[] = [];
  if (archetypeId) {
    const resolved = resolveArchetypeGroups(
      archetypeId,
      args.effectiveConfig,
      args.libraryByName,
      { slotFilter: PREP_SLOTS },
    );
    waiveMilkSurcharge = resolved.waiveMilkSurcharge;
    allowNoMilk = defaultAllowNoMilk(archetypeId, { name: item.name });
    prepGroupIds = resolved.groupIds;
  }

  const attachedIds = [
    ...squareGroupIds,
    ...prepGroupIds.filter((id) => !squareGroupIds.includes(id)),
  ];

  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO menu_items (
       cafe_id, pos_item_id, name, description, price_minor, currency, category, subcategory,
       image_url, is_available, tags, modifier_groups, sizes, sort_order,
       archetype, waive_milk_surcharge, allow_no_milk, synced_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8,
       $9, $10, $11::text[], '[]'::jsonb, $12::jsonb, $13,
       $14, $15, $16, NOW()
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
      item.imageUrl ?? null,
      item.isAvailable !== false,
      item.tags,
      JSON.stringify(item.sizes),
      args.itemSort,
      archetypeId,
      waiveMilkSurcharge,
      allowNoMilk,
    ],
  );

  await setMenuItemModifierGroups(client, rows[0]!.id, attachedIds);
  void args.flowGroups;
  void args.iceToppings;
  return 'created';
}
