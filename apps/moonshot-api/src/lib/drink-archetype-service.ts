import {
  ApiErrorCode,
  DRINK_ARCHETYPES,
  type CafeDrinkArchetypeConfig,
  type DrinkArchetypeDef,
  type DrinkArchetypeId,
  isDrinkArchetypeId,
  platformDrinkArchetypeConfig,
  resolveCafeArchetypeConfig,
  resolveCafeArchetypeRecipe,
} from '@moonshot/types';
import type { Pool, PoolClient } from 'pg';
import {
  libraryByNameFromGroups,
  parseCafeDrinkArchetypeConfig,
  resolveArchetypeGroups,
} from './drink-archetype-resolve.js';
import { ApiHttpError } from './http-errors.js';
import { setMenuItemModifierGroups } from './menu-modifier-library.js';

type Db = Pool | PoolClient;

export type DrinkArchetypeConfigResponse = {
  /** Resolved recipes (platform defaults + café overrides). */
  recipes: Record<DrinkArchetypeId, DrinkArchetypeDef>;
  /** Raw café overrides stored in DB. */
  config: CafeDrinkArchetypeConfig;
  /** Platform catalogue metadata for admin labels. */
  catalogue: typeof DRINK_ARCHETYPES;
};

export async function getCafeDrinkArchetypeConfig(
  db: Db,
  cafeId: string,
): Promise<DrinkArchetypeConfigResponse> {
  const { rows } = await db.query<{ drink_archetype_config: unknown }>(
    `SELECT drink_archetype_config FROM cafes WHERE id = $1`,
    [cafeId],
  );
  if (rows.length === 0) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Café not found');
  }
  const config = parseCafeDrinkArchetypeConfig(rows[0]!.drink_archetype_config);
  const merged =
    Object.keys(config).length === 0
      ? platformDrinkArchetypeConfig()
      : config;
  return {
    recipes: resolveCafeArchetypeConfig(merged),
    config: merged,
    catalogue: DRINK_ARCHETYPES,
  };
}

function validateConfigBody(body: unknown): CafeDrinkArchetypeConfig {
  if (body == null || typeof body !== 'object' || Array.isArray(body)) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'config object is required');
  }
  const raw = body as Record<string, unknown>;
  // Accept either { config: {...} } or a flat archetype map.
  const source =
    'config' in raw && raw.config != null && typeof raw.config === 'object'
      ? (raw.config as Record<string, unknown>)
      : raw;

  const parsed = parseCafeDrinkArchetypeConfig(source);
  for (const id of Object.keys(source)) {
    if (!isDrinkArchetypeId(id) && id !== 'config') {
      // Ignore unknown keys only when using wrapped { config }; flat map must be valid ids.
      if (!('config' in raw)) {
        throw new ApiHttpError(400, ApiErrorCode.VALIDATION, `Unknown archetype: ${id}`);
      }
    }
  }
  // Ensure every platform archetype is present after save (full snapshot).
  const full = platformDrinkArchetypeConfig();
  for (const a of DRINK_ARCHETYPES) {
    const override = parsed[a.id];
    if (override) {
      full[a.id] = {
        slots: override.slots ?? a.slots,
        milkCharge: override.milkCharge ?? a.milkCharge,
      };
    }
  }
  // Normalise milk charge vs milk slot.
  for (const id of Object.keys(full) as DrinkArchetypeId[]) {
    const recipe = resolveCafeArchetypeRecipe(id, full);
    full[id] = { slots: recipe.slots, milkCharge: recipe.milkCharge };
  }
  return full;
}

export async function patchCafeDrinkArchetypeConfig(
  db: Db,
  cafeId: string,
  body: unknown,
): Promise<DrinkArchetypeConfigResponse> {
  const config = validateConfigBody(body);
  const { rowCount } = await db.query(
    `UPDATE cafes SET drink_archetype_config = $1::jsonb WHERE id = $2`,
    [JSON.stringify(config), cafeId],
  );
  if (rowCount === 0) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Café not found');
  }
  return getCafeDrinkArchetypeConfig(db, cafeId);
}

async function loadLibraryMap(db: Db, cafeId: string) {
  const { rows } = await db.query<{ id: string; name: string; options: unknown }>(
    `SELECT id, name, options FROM modifier_groups WHERE cafe_id = $1`,
    [cafeId],
  );
  return libraryByNameFromGroups(rows);
}

async function loadCafeConfig(db: Db, cafeId: string): Promise<CafeDrinkArchetypeConfig> {
  const { rows } = await db.query<{ drink_archetype_config: unknown }>(
    `SELECT drink_archetype_config FROM cafes WHERE id = $1`,
    [cafeId],
  );
  if (rows.length === 0) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Café not found');
  }
  const parsed = parseCafeDrinkArchetypeConfig(rows[0]!.drink_archetype_config);
  return Object.keys(parsed).length === 0 ? platformDrinkArchetypeConfig() : parsed;
}

/**
 * Re-attach modifier groups + sync waive flag for all items with the given archetype.
 * Does not change items that have no archetype or a different one.
 */
export async function applyArchetypeToItems(
  db: Db,
  cafeId: string,
  archetypeId: DrinkArchetypeId,
): Promise<{ updatedCount: number }> {
  if (!isDrinkArchetypeId(archetypeId)) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Invalid archetype id');
  }

  const config = await loadCafeConfig(db, cafeId);
  const library = await loadLibraryMap(db, cafeId);
  const resolved = resolveArchetypeGroups(archetypeId, config, library);

  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM menu_items WHERE cafe_id = $1 AND archetype = $2`,
    [cafeId, archetypeId],
  );

  for (const row of rows) {
    await db.query(
      `UPDATE menu_items SET waive_milk_surcharge = $1 WHERE id = $2 AND cafe_id = $3`,
      [resolved.waiveMilkSurcharge, row.id, cafeId],
    );
    await setMenuItemModifierGroups(db, row.id, resolved.groupIds);
  }

  return { updatedCount: rows.length };
}

export async function resolveGroupsForArchetype(
  db: Db,
  cafeId: string,
  archetypeId: DrinkArchetypeId,
): Promise<{ groupIds: string[]; waiveMilkSurcharge: boolean }> {
  const config = await loadCafeConfig(db, cafeId);
  const library = await loadLibraryMap(db, cafeId);
  const resolved = resolveArchetypeGroups(archetypeId, config, library);
  return {
    groupIds: resolved.groupIds,
    waiveMilkSurcharge: resolved.waiveMilkSurcharge,
  };
}
