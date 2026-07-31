import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import {
  ApiErrorCode,
  defaultAllowNoMilk,
  inferDrinkArchetypeFromName,
  isDrinkMenuCategory,
  platformDrinkArchetypeConfig,
  type DrinkArchetypeSlot,
  type MenuProvisionResult,
  type NormalisedMenu,
  type NormalisedMenuItem,
} from '@moonshot/types';
import {
  libraryByNameFromGroups,
  parseCafeDrinkArchetypeConfig,
  resolveArchetypeGroups,
} from './drink-archetype-resolve.js';
import { MenuProvisionError } from './menu-provisioners/errors.js';
import { setMenuItemModifierGroups } from './menu-modifier-library.js';
import {
  ensureFlowPrepModifierGroups,
  ensureIceAndToppingsModifierGroups,
} from './menu-seed-library.js';
import { ensureSystemMenuSections } from './menu-sections.js';
import type { ImportModifierGroup } from './pos-adapters/square/catalog-normalise.js';
import type { ModifierRoleHint } from './pos-adapters/square/role-hints.js';

/** Prep slots Square cannot express — layered from Moonshot archetypes. */
const PREP_SLOTS: readonly DrinkArchetypeSlot[] = [
  'shots',
  'beans',
  'milk_temperature',
  'milk_texture',
  'ice_level',
  'toppings',
];

export type PersistCatalogOptions = {
  groupsByPosId: Map<string, ImportModifierGroup>;
  roleHints: Map<string, ModifierRoleHint>;
};

/**
 * Persist a normalised POS catalogue into Postgres for onboarding.
 * Square owns items + modifier lists; Moonshot layers Flow prep groups via archetypes.
 */
export async function persistNormalisedMenuCatalog(
  client: PoolClient,
  cafeId: string,
  menu: NormalisedMenu,
  opts: PersistCatalogOptions,
): Promise<MenuProvisionResult> {
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

  if (menu.items.length === 0) {
    throw new MenuProvisionError(
      'Square catalogue has no sellable items to import',
      400,
      ApiErrorCode.VALIDATION,
    );
  }

  await ensureSystemMenuSections(client, cafeId, {
    foodEnabled: menu.items.some((i) => i.category === 'food'),
  });

  // Upsert custom sections from the normalised menu.
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

  // Ensure platform archetype config exists.
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

  // Upsert Square modifier groups (claim seeded Milks/Syrups by name when needed).
  const dbGroupIdByPosId = new Map<string, string>();
  let milksGroupId: string | null = null;
  let syrupsGroupId: string | null = null;
  let sortOrder = 0;

  for (const [posGroupId, group] of opts.groupsByPosId) {
    const dbId = await upsertModifierGroup(client, cafeId, group, sortOrder++);
    dbGroupIdByPosId.set(posGroupId, dbId);
    const role = opts.roleHints.get(posGroupId);
    if (role === 'milk') milksGroupId = dbId;
    if (role === 'syrup') syrupsGroupId = dbId;
  }

  // Flow prep groups Square never has.
  const flowGroups = await ensureFlowPrepModifierGroups(client, cafeId);
  const iceToppings = await ensureIceAndToppingsModifierGroups(client, cafeId);

  const { rows: allGroups } = await client.query<{
    id: string;
    name: string;
    options: unknown;
  }>(`SELECT id, name, options FROM modifier_groups WHERE cafe_id = $1`, [cafeId]);
  const libraryByName = libraryByNameFromGroups(allGroups);

  let itemCount = 0;
  let itemSort = 0;

  for (const item of menu.items) {
    await insertCatalogItem(client, {
      cafeId,
      item,
      itemSort: itemSort++,
      dbGroupIdByPosId,
      effectiveConfig,
      libraryByName,
      flowGroups,
      iceToppings,
    });
    itemCount++;
  }

  await reconcileOrphanSeededGroups(client, cafeId, opts.roleHints);
  await syncKdsModifierClassification(client, cafeId, opts);

  return {
    itemCount,
    groupCount: opts.groupsByPosId.size,
    milksGroupId,
    syrupsGroupId,
  };
}

async function upsertModifierGroup(
  client: PoolClient,
  cafeId: string,
  group: ImportModifierGroup,
  sortOrder: number,
): Promise<string> {
  // Prefer match by pos_group_id.
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

async function insertCatalogItem(
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
): Promise<void> {
  const { cafeId, item } = args;
  const archetypeId = isDrinkMenuCategory(item.category)
    ? inferDrinkArchetypeFromName(item.name)
    : null;

  let waiveMilkSurcharge = false;
  let allowNoMilk = false;
  const squareGroupIds: string[] = [];
  for (const g of item.modifierGroups) {
    // g.id is the Square pos list id during import.
    const dbId = args.dbGroupIdByPosId.get(g.id);
    if (dbId) squareGroupIds.push(dbId);
  }

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

  // Square groups first (café's optionality), then Moonshot prep groups.
  const attachedIds = [...squareGroupIds, ...prepGroupIds.filter((id) => !squareGroupIds.includes(id))];

  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO menu_items (
       cafe_id, pos_item_id, name, description, price_minor, currency, category, subcategory,
       image_url, is_available, tags, modifier_groups, sizes, sort_order,
       archetype, waive_milk_surcharge, allow_no_milk, synced_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8,
       NULL, TRUE, $9::text[], '[]'::jsonb, $10::jsonb, $11,
       $12, $13, $14, NOW()
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
}

/**
 * Drop signup-seeded Milks/Syrups that were never claimed by a Square list
 * and have no item attachments (orphans after Square owns those roles).
 */
async function reconcileOrphanSeededGroups(
  client: PoolClient,
  cafeId: string,
  roleHints: Map<string, ModifierRoleHint>,
): Promise<void> {
  const hasSquareMilk = [...roleHints.values()].includes('milk');
  const hasSquareSyrup = [...roleHints.values()].includes('syrup');
  const namesToMaybeDrop: string[] = [];
  if (hasSquareMilk) namesToMaybeDrop.push('Milks');
  if (hasSquareSyrup) namesToMaybeDrop.push('Syrups');
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

/** Append Square list names into café KDS classification so chips still resolve. */
async function syncKdsModifierClassification(
  client: PoolClient,
  cafeId: string,
  opts: PersistCatalogOptions,
): Promise<void> {
  const coffeeModifiers: string[] = [];
  const additions: string[] = [];

  for (const [posId, group] of opts.groupsByPosId) {
    const role = opts.roleHints.get(posId) ?? 'other';
    if (role === 'milk') coffeeModifiers.push(group.name);
    else if (role === 'syrup' || role === 'topping') additions.push(group.name);
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
