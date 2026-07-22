import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import {
  MENU_TEMPLATE_EXTRA_SHOT_PRICE_MINOR,
  MENU_TEMPLATE_NON_DAIRY_MILK_PRICE_MINOR,
  MENU_TEMPLATE_SYRUP_PRICE_MINOR,
} from '@moonshot/types';

/** Option shape stored in modifier_groups.options JSONB. */
type SeedOption = {
  id: string;
  posOptionId: null;
  name: string;
  priceMinor: number;
  isDefault: boolean;
  colorHex: string | null;
  chipLabel: string;
};

function opt(
  name: string,
  opts: { isDefault?: boolean; priceMinor?: number; colorHex?: string | null; chipLabel?: string } = {},
): SeedOption {
  return {
    id: randomUUID(),
    posOptionId: null,
    name,
    priceMinor: opts.priceMinor ?? 0,
    isDefault: opts.isDefault ?? false,
    colorHex: opts.colorHex ?? null,
    chipLabel: opts.chipLabel ?? name.slice(0, 2),
  };
}

/**
 * Starter modifier library for self-service cafés — milks, syrups, and Flow
 * coffee-prep groups (shots / beans / milk temp / milk texture).
 * Returns group ids so callers can attach them to drinks.
 */
export async function seedDefaultModifierLibrary(
  client: PoolClient,
  cafeId: string,
): Promise<{
  milksId: string;
  syrupsId: string;
  shotsId: string;
  beansId: string;
  milkTemperatureId: string;
  milkTextureId: string;
}> {
  const milksId = randomUUID();
  const syrupsId = randomUUID();
  const shotsId = randomUUID();
  const beansId = randomUUID();
  const milkTemperatureId = randomUUID();
  const milkTextureId = randomUUID();

  const milksOptions = [
    opt('Whole', { isDefault: true, colorHex: '#f5f0e8', chipLabel: 'WM' }),
    opt('Skinny', { colorHex: '#fafafa', chipLabel: 'Sk' }),
    opt('Oat', {
      priceMinor: MENU_TEMPLATE_NON_DAIRY_MILK_PRICE_MINOR,
      colorHex: '#e8dcc8',
      chipLabel: 'Oa',
    }),
    opt('Almond', {
      priceMinor: MENU_TEMPLATE_NON_DAIRY_MILK_PRICE_MINOR,
      colorHex: '#f4a6b8',
      chipLabel: 'Al',
    }),
    opt('Coconut', {
      priceMinor: MENU_TEMPLATE_NON_DAIRY_MILK_PRICE_MINOR,
      colorHex: '#ffffff',
      chipLabel: 'Co',
    }),
    opt('Soy', {
      priceMinor: MENU_TEMPLATE_NON_DAIRY_MILK_PRICE_MINOR,
      colorHex: '#f5e6a8',
      chipLabel: 'So',
    }),
    opt('Cashew', {
      priceMinor: MENU_TEMPLATE_NON_DAIRY_MILK_PRICE_MINOR,
      colorHex: '#e8d4b8',
      chipLabel: 'Ca',
    }),
  ];

  const syrupsOptions = [
    opt('Vanilla', { priceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR, colorHex: '#f5e6c8', chipLabel: 'Va' }),
    opt('Caramel', { priceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR, colorHex: '#c68642', chipLabel: 'Ca' }),
    opt('Hazelnut', { priceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR, colorHex: '#8b5a2b', chipLabel: 'Ha' }),
    opt('White chocolate', {
      priceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR,
      colorHex: '#f0ebe3',
      chipLabel: 'WC',
    }),
    opt('Strawberry', {
      priceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR,
      colorHex: '#f4a6b8',
      chipLabel: 'St',
    }),
    opt('Raspberry', {
      priceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR,
      colorHex: '#d4507a',
      chipLabel: 'Ra',
    }),
    opt('Blueberry', {
      priceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR,
      colorHex: '#4a6fa5',
      chipLabel: 'Bl',
    }),
    opt('Salted caramel', {
      priceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR,
      colorHex: '#b8860b',
      chipLabel: 'SC',
    }),
    opt('Honey', { priceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR, colorHex: '#f0b429', chipLabel: 'Ho' }),
  ];

  const shotsOptions = [
    opt('Single', { chipLabel: '1' }),
    opt('Double', { isDefault: true, chipLabel: '2' }),
    opt('Triple', { chipLabel: '3', priceMinor: MENU_TEMPLATE_EXTRA_SHOT_PRICE_MINOR }),
    opt('Quad', { chipLabel: '4', priceMinor: MENU_TEMPLATE_EXTRA_SHOT_PRICE_MINOR }),
  ];

  const beansOptions = [
    opt('House', { isDefault: true, chipLabel: 'Ho' }),
    opt('Decaf', { chipLabel: 'Dc' }),
    opt('Guest', { chipLabel: 'Gu' }),
  ];

  // Warm leftmost so the slider reads cool → hot; Hot remains default.
  const milkTemperatureOptions = [
    opt('Warm', { chipLabel: 'Warm' }),
    opt('Hot', { isDefault: true, chipLabel: 'Hot' }),
    opt('Extra Hot', { chipLabel: 'XH' }),
    opt('Extra Extra Hot', { chipLabel: 'XXH' }),
  ];

  // Wet → Standard → Dry continuum; Standard is default (centre).
  const milkTextureOptions = [
    opt('Wet', { chipLabel: 'Wet' }),
    opt('Standard', { isDefault: true, chipLabel: 'Std' }),
    opt('Dry', { chipLabel: 'Dry' }),
    opt('Extra Foam', { chipLabel: 'EF' }),
  ];

  await client.query(
    `INSERT INTO modifier_groups (id, cafe_id, name, selection_type, required, options, sort_order)
     VALUES
       ($1, $2, 'Milks', 'single', TRUE, $3::jsonb, 0),
       ($4, $2, 'Syrups', 'multi', FALSE, $5::jsonb, 1),
       ($6, $2, 'Beans', 'single', TRUE, $7::jsonb, 2),
       ($8, $2, 'Shots', 'single', TRUE, $9::jsonb, 3),
       ($10, $2, 'Milk Temperature', 'single', TRUE, $11::jsonb, 4),
       ($12, $2, 'Milk Texture', 'single', TRUE, $13::jsonb, 5)`,
    [
      milksId,
      cafeId,
      JSON.stringify(milksOptions),
      syrupsId,
      JSON.stringify(syrupsOptions),
      beansId,
      JSON.stringify(beansOptions),
      shotsId,
      JSON.stringify(shotsOptions),
      milkTemperatureId,
      JSON.stringify(milkTemperatureOptions),
      milkTextureId,
      JSON.stringify(milkTextureOptions),
    ],
  );

  return { milksId, syrupsId, shotsId, beansId, milkTemperatureId, milkTextureId };
}

/** Ensure Flow coffee-prep groups exist for a café; create with defaults if missing. */
export async function ensureFlowPrepModifierGroups(
  client: PoolClient,
  cafeId: string,
): Promise<{
  shotsId: string;
  beansId: string;
  milkTemperatureId: string;
  milkTextureId: string;
}> {
  async function findOrCreate(
    name: string,
    sortOrder: number,
    options: SeedOption[],
  ): Promise<string> {
    const existing = await client.query<{ id: string }>(
      `SELECT id FROM modifier_groups WHERE cafe_id = $1 AND name = $2 LIMIT 1`,
      [cafeId, name],
    );
    if (existing.rows[0]) return existing.rows[0].id;

    const id = randomUUID();
    // Unique (cafe_id, name) + ON CONFLICT closes the check-then-insert race.
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO modifier_groups (id, cafe_id, name, selection_type, required, options, sort_order)
       VALUES ($1, $2, $3, 'single', TRUE, $4::jsonb, $5)
       ON CONFLICT (cafe_id, name) DO NOTHING
       RETURNING id`,
      [id, cafeId, name, JSON.stringify(options), sortOrder],
    );
    if (inserted.rows[0]) return inserted.rows[0].id;

    const again = await client.query<{ id: string }>(
      `SELECT id FROM modifier_groups WHERE cafe_id = $1 AND name = $2 LIMIT 1`,
      [cafeId, name],
    );
    return again.rows[0]!.id;
  }

  const beansId = await findOrCreate('Beans', 2, [
    opt('House', { isDefault: true, chipLabel: 'Ho' }),
    opt('Decaf', { chipLabel: 'Dc' }),
    opt('Guest', { chipLabel: 'Gu' }),
  ]);
  const shotsId = await findOrCreate('Shots', 3, [
    opt('Single', { chipLabel: '1' }),
    opt('Double', { isDefault: true, chipLabel: '2' }),
    opt('Triple', { chipLabel: '3', priceMinor: MENU_TEMPLATE_EXTRA_SHOT_PRICE_MINOR }),
    opt('Quad', { chipLabel: '4', priceMinor: MENU_TEMPLATE_EXTRA_SHOT_PRICE_MINOR }),
  ]);
  const milkTemperatureId = await findOrCreate('Milk Temperature', 4, [
    opt('Warm', { chipLabel: 'Warm' }),
    opt('Hot', { isDefault: true, chipLabel: 'Hot' }),
    opt('Extra Hot', { chipLabel: 'XH' }),
    opt('Extra Extra Hot', { chipLabel: 'XXH' }),
  ]);
  const milkTextureId = await findOrCreate('Milk Texture', 5, [
    opt('Wet', { chipLabel: 'Wet' }),
    opt('Standard', { isDefault: true, chipLabel: 'Std' }),
    opt('Dry', { chipLabel: 'Dry' }),
    opt('Extra Foam', { chipLabel: 'EF' }),
  ]);

  return { shotsId, beansId, milkTemperatureId, milkTextureId };
}
