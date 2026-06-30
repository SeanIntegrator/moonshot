import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import {
  MENU_TEMPLATE_NON_DAIRY_MILK_PRICE_MINOR,
  MENU_TEMPLATE_SYRUP_PRICE_MINOR,
} from '@moonshot/types';

/** Starter modifier library for self-service cafés — full template set; onboarding step trims selections. */
export async function seedDefaultModifierLibrary(client: PoolClient, cafeId: string): Promise<void> {
  const milksId = randomUUID();
  const syrupsId = randomUUID();

  const milksOptions = [
    { id: randomUUID(), posOptionId: null, name: 'Whole', priceMinor: 0, isDefault: true, colorHex: '#f5f0e8', chipLabel: 'WM' },
    { id: randomUUID(), posOptionId: null, name: 'Skinny', priceMinor: 0, isDefault: false, colorHex: '#fafafa', chipLabel: 'Sk' },
    { id: randomUUID(), posOptionId: null, name: 'Oat', priceMinor: MENU_TEMPLATE_NON_DAIRY_MILK_PRICE_MINOR, isDefault: false, colorHex: '#e8dcc8', chipLabel: 'Oa' },
    { id: randomUUID(), posOptionId: null, name: 'Almond', priceMinor: MENU_TEMPLATE_NON_DAIRY_MILK_PRICE_MINOR, isDefault: false, colorHex: '#f4a6b8', chipLabel: 'Al' },
    { id: randomUUID(), posOptionId: null, name: 'Coconut', priceMinor: MENU_TEMPLATE_NON_DAIRY_MILK_PRICE_MINOR, isDefault: false, colorHex: '#ffffff', chipLabel: 'Co' },
    { id: randomUUID(), posOptionId: null, name: 'Soy', priceMinor: MENU_TEMPLATE_NON_DAIRY_MILK_PRICE_MINOR, isDefault: false, colorHex: '#f5e6a8', chipLabel: 'So' },
    { id: randomUUID(), posOptionId: null, name: 'Cashew', priceMinor: MENU_TEMPLATE_NON_DAIRY_MILK_PRICE_MINOR, isDefault: false, colorHex: '#e8d4b8', chipLabel: 'Ca' },
  ];

  const syrupsOptions = [
    { id: randomUUID(), posOptionId: null, name: 'Vanilla', priceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR, isDefault: false, colorHex: '#f5e6c8', chipLabel: 'Va' },
    { id: randomUUID(), posOptionId: null, name: 'Caramel', priceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR, isDefault: false, colorHex: '#c68642', chipLabel: 'Ca' },
    { id: randomUUID(), posOptionId: null, name: 'Hazelnut', priceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR, isDefault: false, colorHex: '#8b5a2b', chipLabel: 'Ha' },
    { id: randomUUID(), posOptionId: null, name: 'White chocolate', priceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR, isDefault: false, colorHex: '#f0ebe3', chipLabel: 'WC' },
    { id: randomUUID(), posOptionId: null, name: 'Strawberry', priceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR, isDefault: false, colorHex: '#f4a6b8', chipLabel: 'St' },
    { id: randomUUID(), posOptionId: null, name: 'Raspberry', priceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR, isDefault: false, colorHex: '#d4507a', chipLabel: 'Ra' },
    { id: randomUUID(), posOptionId: null, name: 'Blueberry', priceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR, isDefault: false, colorHex: '#4a6fa5', chipLabel: 'Bl' },
    { id: randomUUID(), posOptionId: null, name: 'Salted caramel', priceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR, isDefault: false, colorHex: '#b8860b', chipLabel: 'SC' },
    { id: randomUUID(), posOptionId: null, name: 'Honey', priceMinor: MENU_TEMPLATE_SYRUP_PRICE_MINOR, isDefault: false, colorHex: '#f0b429', chipLabel: 'Ho' },
  ];

  await client.query(
    `INSERT INTO modifier_groups (id, cafe_id, name, selection_type, required, options, sort_order)
     VALUES
       ($1, $2, 'Milks', 'single', TRUE, $3::jsonb, 0),
       ($4, $2, 'Syrups', 'multi', FALSE, $5::jsonb, 1)`,
    [milksId, cafeId, JSON.stringify(milksOptions), syrupsId, JSON.stringify(syrupsOptions)],
  );
}
