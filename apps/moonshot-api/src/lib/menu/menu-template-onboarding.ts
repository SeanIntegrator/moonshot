import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { ApiErrorCode } from '@moonshot/types';
import { MENU_TEMPLATE_CATEGORIES, MENU_TEMPLATE_DEFAULT_DRINK_PRICE_MINOR, MENU_TEMPLATE_DRINK_ARCHETYPE, defaultAllowNoMilk, platformDrinkArchetypeConfig, type AdminSaveMenuTemplateRequest, type AdminSaveMenuTemplateResponse, type MenuTemplateCategoryKey, type MenuTemplateDrinkKey, type MenuTemplateModifierKey } from '@moonshot/domain';
import {
  libraryByNameFromGroups,
  parseCafeDrinkArchetypeConfig,
  resolveArchetypeGroups,
} from '../drink-archetype-resolve.js';
import { copyTemplateDrinkImageToCafeItem } from './menu-image-storage.js';
import { MILK_CHIP, SYRUP_CHIP, type ChipMeta } from './menu-chip-palette.js';
import { setMenuItemModifierGroups } from './menu-modifier-library.js';
import {
  ensureFlowPrepModifierGroups,
  ensureIceAndToppingsModifierGroups,
} from './menu-seed-library.js';
import { ensureSystemMenuSections } from './menu-sections.js';

export class MenuTemplateError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: typeof ApiErrorCode.VALIDATION | typeof ApiErrorCode.CONFLICT,
  ) {
    super(message);
    this.name = 'MenuTemplateError';
  }
}

const DRINK_KEYS = new Set(
  MENU_TEMPLATE_CATEGORIES.flatMap((c) => (c.drinks ?? []).map((d) => d.key)),
);
const MODIFIER_KEYS = new Set(
  MENU_TEMPLATE_CATEGORIES.flatMap((c) => (c.modifiers ?? []).map((m) => m.key)),
);
const DRINK_DEF_BY_KEY = new Map(
  MENU_TEMPLATE_CATEGORIES.flatMap((c) => c.drinks ?? []).map((d) => [d.key, d] as const),
);
const CATEGORY_KEYS = new Set(MENU_TEMPLATE_CATEGORIES.map((c) => c.key));

function validateRequest(body: AdminSaveMenuTemplateRequest): void {
  if (!Array.isArray(body.categories) || body.categories.length === 0) {
    throw new MenuTemplateError('categories are required', 400, ApiErrorCode.VALIDATION);
  }

  const seenCategories = new Set<MenuTemplateCategoryKey>();
  for (const cat of body.categories) {
    if (!CATEGORY_KEYS.has(cat.key)) {
      throw new MenuTemplateError(`Unknown category: ${cat.key}`, 400, ApiErrorCode.VALIDATION);
    }
    if (seenCategories.has(cat.key)) {
      throw new MenuTemplateError(`Duplicate category: ${cat.key}`, 400, ApiErrorCode.VALIDATION);
    }
    seenCategories.add(cat.key);

    if ((cat.key === 'hot_drinks' || cat.key === 'milks') && !cat.enabled) {
      throw new MenuTemplateError(`${cat.key} cannot be disabled`, 400, ApiErrorCode.VALIDATION);
    }

    if (cat.key === 'hot_drinks' || cat.key === 'cold_drinks') {
      if (!Array.isArray(cat.drinks)) {
        throw new MenuTemplateError(`drinks required for ${cat.key}`, 400, ApiErrorCode.VALIDATION);
      }
      const seenDrinks = new Set<MenuTemplateDrinkKey>();
      for (const drink of cat.drinks) {
        if (!DRINK_KEYS.has(drink.templateKey)) {
          throw new MenuTemplateError(`Unknown drink: ${drink.templateKey}`, 400, ApiErrorCode.VALIDATION);
        }
        if (seenDrinks.has(drink.templateKey)) {
          throw new MenuTemplateError(`Duplicate drink: ${drink.templateKey}`, 400, ApiErrorCode.VALIDATION);
        }
        seenDrinks.add(drink.templateKey);
        const def = DRINK_DEF_BY_KEY.get(drink.templateKey)!;
        if (def.category !== cat.key) {
          throw new MenuTemplateError(
            `Drink ${drink.templateKey} does not belong in ${cat.key}`,
            400,
            ApiErrorCode.VALIDATION,
          );
        }
        if (!drink.name.trim()) {
          throw new MenuTemplateError('Drink name is required', 400, ApiErrorCode.VALIDATION);
        }
        if (!Number.isFinite(drink.priceMinor) || drink.priceMinor < 1) {
          throw new MenuTemplateError('Drink price must be at least 1p', 400, ApiErrorCode.VALIDATION);
        }
      }
    }

    if (cat.key === 'milks' || cat.key === 'syrups') {
      if (!Array.isArray(cat.modifiers)) {
        throw new MenuTemplateError(`modifiers required for ${cat.key}`, 400, ApiErrorCode.VALIDATION);
      }
      const seenMods = new Set<MenuTemplateModifierKey>();
      for (const mod of cat.modifiers) {
        if (!MODIFIER_KEYS.has(mod.templateKey)) {
          throw new MenuTemplateError(`Unknown modifier: ${mod.templateKey}`, 400, ApiErrorCode.VALIDATION);
        }
        if (seenMods.has(mod.templateKey)) {
          throw new MenuTemplateError(`Duplicate modifier: ${mod.templateKey}`, 400, ApiErrorCode.VALIDATION);
        }
        seenMods.add(mod.templateKey);
        if (!mod.name.trim()) {
          throw new MenuTemplateError('Modifier name is required', 400, ApiErrorCode.VALIDATION);
        }
        if (!Number.isFinite(mod.priceMinor) || mod.priceMinor < 0) {
          throw new MenuTemplateError('Modifier price must be 0 or more', 400, ApiErrorCode.VALIDATION);
        }
      }
    }
  }

  if (!seenCategories.has('hot_drinks') || !seenCategories.has('milks')) {
    throw new MenuTemplateError('hot_drinks and milks categories are required', 400, ApiErrorCode.VALIDATION);
  }

  const hot = body.categories.find((c) => c.key === 'hot_drinks')!;
  const milks = body.categories.find((c) => c.key === 'milks')!;
  const enabledHotDrinks = hot.enabled ? hot.drinks!.filter((d) => d.enabled) : [];
  const enabledMilks = milks.enabled ? milks.modifiers!.filter((m) => m.enabled) : [];

  if (enabledHotDrinks.length === 0) {
    throw new MenuTemplateError('Select at least one hot drink', 400, ApiErrorCode.VALIDATION);
  }
  if (enabledMilks.length === 0) {
    throw new MenuTemplateError('Select at least one milk option', 400, ApiErrorCode.VALIDATION);
  }
}

async function findModifierGroupId(
  client: PoolClient,
  cafeId: string,
  name: string,
): Promise<string | null> {
  const { rows } = await client.query<{ id: string }>(
    `SELECT id FROM modifier_groups WHERE cafe_id = $1 AND name = $2 LIMIT 1`,
    [cafeId, name],
  );
  return rows[0]?.id ?? null;
}

function buildModifierOptions(
  modifiers: AdminSaveMenuTemplateRequest['categories'][number]['modifiers'],
  chipMap: Record<string, ChipMeta>,
  /** When true (milks), fall back to the first enabled option if none is marked default. */
  requireDefault = false,
) {
  const enabled = (modifiers ?? []).filter((m) => m.enabled);
  const defaultKeys = enabled.filter((m) => m.isDefault).map((m) => m.templateKey);
  // Syrups are optional multi-select — do not invent a default (e.g. Vanilla).
  const defaultKey = defaultKeys[0] ?? (requireDefault ? (enabled[0]?.templateKey ?? null) : null);

  return enabled.map((m) => {
    const chip = chipMap[m.templateKey] ?? { colorHex: '#e8e8e8', chipLabel: m.name.slice(0, 2) };
    return {
      id: randomUUID(),
      posOptionId: null,
      name: m.name.trim(),
      priceMinor: Math.round(m.priceMinor),
      isDefault: defaultKey != null && m.templateKey === defaultKey,
      colorHex: chip.colorHex,
      chipLabel: chip.chipLabel,
    };
  });
}

/**
 * Onboarding menu template: upsert Milks/Syrups library groups, create selected drinks,
 * attach modifier sections. Runs inside a transaction — caller must BEGIN/COMMIT.
 */
export async function applyMenuTemplate(
  client: PoolClient,
  cafeId: string,
  body: AdminSaveMenuTemplateRequest,
): Promise<AdminSaveMenuTemplateResponse> {
  validateRequest(body);

  const existingMenu = await client.query<{ id: string }>(
    `SELECT id FROM menu_items WHERE cafe_id = $1 AND is_available = TRUE LIMIT 1`,
    [cafeId],
  );
  if (existingMenu.rows.length > 0) {
    throw new MenuTemplateError(
      'Menu already has items — use the dashboard menu editor to make changes',
      409,
      ApiErrorCode.CONFLICT,
    );
  }

  const milksCat = body.categories.find((c) => c.key === 'milks')!;
  const syrupsCat = body.categories.find((c) => c.key === 'syrups');
  const syrupsEnabled = syrupsCat?.enabled === true;

  const milksOptions = buildModifierOptions(milksCat.modifiers, MILK_CHIP, true);
  const syrupsOptions = syrupsEnabled
    ? buildModifierOptions(syrupsCat?.modifiers, SYRUP_CHIP, false)
    : [];

  let milksGroupId = await findModifierGroupId(client, cafeId, 'Milks');
  if (milksGroupId) {
    await client.query(
      `UPDATE modifier_groups SET options = $1::jsonb, updated_at = NOW() WHERE id = $2 AND cafe_id = $3`,
      [JSON.stringify(milksOptions), milksGroupId, cafeId],
    );
  } else {
    milksGroupId = randomUUID();
    await client.query(
      `INSERT INTO modifier_groups (id, cafe_id, name, selection_type, required, options, sort_order)
       VALUES ($1, $2, 'Milks', 'single', TRUE, $3::jsonb, 0)`,
      [milksGroupId, cafeId, JSON.stringify(milksOptions)],
    );
  }

  let syrupsGroupId = await findModifierGroupId(client, cafeId, 'Syrups');
  if (syrupsGroupId) {
    await client.query(
      `UPDATE modifier_groups SET options = $1::jsonb, updated_at = NOW() WHERE id = $2 AND cafe_id = $3`,
      [JSON.stringify(syrupsOptions), syrupsGroupId, cafeId],
    );
  } else {
    syrupsGroupId = randomUUID();
    await client.query(
      `INSERT INTO modifier_groups (id, cafe_id, name, selection_type, required, options, sort_order)
       VALUES ($1, $2, 'Syrups', 'multi', FALSE, $3::jsonb, 1)`,
      [syrupsGroupId, cafeId, JSON.stringify(syrupsOptions)],
    );
  }

  const flowGroups = await ensureFlowPrepModifierGroups(client, cafeId);
  const iceToppings = await ensureIceAndToppingsModifierGroups(client, cafeId);

  // Ensure café has platform archetype recipes if still empty.
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

  const libraryRows = [
    { id: milksGroupId, name: 'Milks', options: milksOptions },
    { id: syrupsGroupId, name: 'Syrups', options: syrupsOptions },
    { id: flowGroups.beansId, name: 'Beans', options: [{}] },
    { id: flowGroups.shotsId, name: 'Shots', options: [{}] },
    { id: flowGroups.milkTemperatureId, name: 'Milk Temperature', options: [{}] },
    { id: flowGroups.milkTextureId, name: 'Milk Texture', options: [{}] },
    { id: iceToppings.iceLevelId, name: 'Ice Level', options: [{}] },
    { id: iceToppings.toppingsId, name: 'Toppings', options: [{}] },
  ];
  // When syrups are disabled, mark as empty so syrup slot is skipped.
  if (!syrupsEnabled || syrupsOptions.length === 0) {
    const syrups = libraryRows.find((r) => r.name === 'Syrups');
    if (syrups) syrups.options = [];
  }
  const libraryByName = libraryByNameFromGroups(libraryRows);

  const drinkCategories = body.categories.filter(
    (c) => (c.key === 'hot_drinks' || c.key === 'cold_drinks') && c.enabled,
  );

  let sortOrder = 0;
  let itemCount = 0;

  for (const cat of drinkCategories) {
    for (const drink of cat.drinks ?? []) {
      if (!drink.enabled) continue;
      const def = DRINK_DEF_BY_KEY.get(drink.templateKey)!;
      const priceMinor = Number.isFinite(drink.priceMinor)
        ? Math.round(drink.priceMinor)
        : MENU_TEMPLATE_DEFAULT_DRINK_PRICE_MINOR;
      const archetypeId = MENU_TEMPLATE_DRINK_ARCHETYPE[drink.templateKey];
      const resolved = resolveArchetypeGroups(archetypeId, effectiveConfig, libraryByName);
      // Tea / iced americano always; americano only among low-milk-hot drinks.
      const allowNoMilk = defaultAllowNoMilk(archetypeId, {
        templateKey: drink.templateKey,
        name: drink.name,
      });

      // Insert first so we have an item id, then copy the canonical template into
      // café-scoped storage. Café replaces never mutate template/drinks/*.
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO menu_items (
          cafe_id, name, description, price_minor, currency, category, subcategory,
          image_url, is_available, tags, modifier_groups, sizes, sort_order,
          archetype, waive_milk_surcharge, allow_no_milk
        ) VALUES ($1, $2, $3, $4, 'GBP', $5, $6, NULL, TRUE, $7::text[], $8::jsonb, $9::jsonb, $10, $11, $12, $13)
        RETURNING id`,
        [
          cafeId,
          drink.name.trim(),
          drink.description.trim() || null,
          priceMinor,
          def.category,
          def.subcategory ?? null,
          [],
          '[]',
          '[]',
          sortOrder++,
          archetypeId,
          resolved.waiveMilkSurcharge,
          allowNoMilk,
        ],
      );
      const itemId = rows[0]!.id;

      const imageUrl = await copyTemplateDrinkImageToCafeItem({
        cafeId,
        itemId,
        templateKey: drink.templateKey,
      });
      if (imageUrl) {
        await client.query(`UPDATE menu_items SET image_url = $1 WHERE id = $2 AND cafe_id = $3`, [
          imageUrl,
          itemId,
          cafeId,
        ]);
      }

      await setMenuItemModifierGroups(client, itemId, resolved.groupIds);
      itemCount++;
    }
  }

  if (itemCount === 0) {
    throw new MenuTemplateError('Select at least one drink', 400, ApiErrorCode.VALIDATION);
  }

  const foodCat = body.categories.find((c) => c.key === 'food');
  await ensureSystemMenuSections(client, cafeId, {
    foodEnabled: foodCat?.enabled === true,
  });

  return { itemCount, milksGroupId, syrupsGroupId };
}
