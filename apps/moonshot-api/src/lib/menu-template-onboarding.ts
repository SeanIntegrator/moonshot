import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import {
  ApiErrorCode,
  MENU_TEMPLATE_CATEGORIES,
  MENU_TEMPLATE_DEFAULT_DRINK_PRICE_MINOR,
  type AdminSaveMenuTemplateRequest,
  type AdminSaveMenuTemplateResponse,
  type MenuTemplateCategoryKey,
  type MenuTemplateDrinkKey,
  type MenuTemplateModifierKey,
} from '@moonshot/types';
import { setMenuItemModifierGroups } from './menu-modifier-library.js';
import { resolveMenuTemplateDrinkImageUrl } from './menu-template-images.js';

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

const MILK_CHIP: Record<string, { colorHex: string; chipLabel: string }> = {
  whole: { colorHex: '#f5f0e8', chipLabel: 'WM' },
  skinny: { colorHex: '#fafafa', chipLabel: 'Sk' },
  oat: { colorHex: '#e8dcc8', chipLabel: 'Oa' },
  almond: { colorHex: '#f4a6b8', chipLabel: 'Al' },
  coconut: { colorHex: '#ffffff', chipLabel: 'Co' },
  soy: { colorHex: '#f5e6a8', chipLabel: 'So' },
  cashew: { colorHex: '#e8d4b8', chipLabel: 'Ca' },
};

const SYRUP_CHIP: Record<string, { colorHex: string; chipLabel: string }> = {
  vanilla: { colorHex: '#f5e6c8', chipLabel: 'Va' },
  caramel: { colorHex: '#c68642', chipLabel: 'Ca' },
  hazelnut: { colorHex: '#8b5a2b', chipLabel: 'Ha' },
  'white-chocolate': { colorHex: '#f0ebe3', chipLabel: 'WC' },
  strawberry: { colorHex: '#f4a6b8', chipLabel: 'St' },
  raspberry: { colorHex: '#d4507a', chipLabel: 'Ra' },
  blueberry: { colorHex: '#4a6fa5', chipLabel: 'Bl' },
  'salted-caramel': { colorHex: '#b8860b', chipLabel: 'SC' },
  honey: { colorHex: '#f0b429', chipLabel: 'Ho' },
};

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
  chipMap: Record<string, { colorHex: string; chipLabel: string }>,
) {
  const enabled = (modifiers ?? []).filter((m) => m.enabled);
  const defaultKeys = enabled.filter((m) => m.isDefault).map((m) => m.templateKey);
  const defaultKey = defaultKeys[0] ?? enabled[0]?.templateKey ?? null;

  return enabled.map((m) => {
    const chip = chipMap[m.templateKey] ?? { colorHex: '#e8e8e8', chipLabel: m.name.slice(0, 2) };
    return {
      id: randomUUID(),
      posOptionId: null,
      name: m.name.trim(),
      priceMinor: Math.round(m.priceMinor),
      isDefault: m.templateKey === defaultKey,
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

  const milksOptions = buildModifierOptions(milksCat.modifiers, MILK_CHIP);
  const syrupsOptions = syrupsEnabled
    ? buildModifierOptions(syrupsCat?.modifiers, SYRUP_CHIP)
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

  const modifierGroupIds = [milksGroupId];
  if (syrupsEnabled && syrupsOptions.length > 0) {
    modifierGroupIds.push(syrupsGroupId);
  }

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

      const imageUrl = resolveMenuTemplateDrinkImageUrl(drink.templateKey);

      // tags is TEXT[]; modifier_groups/sizes are JSONB — mixing these casts caused prod 500s.
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO menu_items (
          cafe_id, name, description, price_minor, currency, category, subcategory,
          image_url, is_available, tags, modifier_groups, sizes, sort_order
        ) VALUES ($1, $2, $3, $4, 'GBP', $5, $6, $7, TRUE, $8::text[], $9::jsonb, $10::jsonb, $11)
        RETURNING id`,
        [
          cafeId,
          drink.name.trim(),
          drink.description.trim() || null,
          priceMinor,
          def.category,
          def.subcategory ?? null,
          imageUrl,
          [],
          '[]',
          '[]',
          sortOrder++,
        ],
      );
      const itemId = rows[0]!.id;
      await setMenuItemModifierGroups(client, itemId, modifierGroupIds);
      itemCount++;
    }
  }

  if (itemCount === 0) {
    throw new MenuTemplateError('Select at least one drink', 400, ApiErrorCode.VALIDATION);
  }

  return { itemCount, milksGroupId, syrupsGroupId };
}
