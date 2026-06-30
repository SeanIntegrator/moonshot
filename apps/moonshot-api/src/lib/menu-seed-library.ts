import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';

/** Starter modifier library for self-service cafés — owners edit or remove freely. */
export async function seedDefaultModifierLibrary(client: PoolClient, cafeId: string): Promise<void> {
  const milksId = randomUUID();
  const syrupsId = randomUUID();

  const milksOptions = [
    { id: randomUUID(), posOptionId: null, name: 'Whole milk', priceMinor: 0, isDefault: true, colorHex: '#f5f0e8', chipLabel: 'WM' },
    { id: randomUUID(), posOptionId: null, name: 'Oat milk', priceMinor: 50, isDefault: false, colorHex: '#e8dcc8', chipLabel: 'Oa' },
    { id: randomUUID(), posOptionId: null, name: 'Almond milk', priceMinor: 50, isDefault: false, colorHex: '#f4a6b8', chipLabel: 'Al' },
    { id: randomUUID(), posOptionId: null, name: 'Coconut milk', priceMinor: 50, isDefault: false, colorHex: '#ffffff', chipLabel: 'Co' },
  ];

  const syrupsOptions = [
    { id: randomUUID(), posOptionId: null, name: 'Vanilla', priceMinor: 50, isDefault: false, colorHex: '#f5e6c8', chipLabel: 'Va' },
    { id: randomUUID(), posOptionId: null, name: 'Caramel', priceMinor: 50, isDefault: false, colorHex: '#c68642', chipLabel: 'Ca' },
    { id: randomUUID(), posOptionId: null, name: 'Hazelnut', priceMinor: 50, isDefault: false, colorHex: '#8b5a2b', chipLabel: 'Ha' },
    { id: randomUUID(), posOptionId: null, name: 'Honey', priceMinor: 40, isDefault: false, colorHex: '#f0b429', chipLabel: 'Ho' },
  ];

  await client.query(
    `INSERT INTO modifier_groups (id, cafe_id, name, selection_type, required, options, sort_order)
     VALUES
       ($1, $2, 'Milks', 'single', TRUE, $3::jsonb, 0),
       ($4, $2, 'Syrups', 'multi', FALSE, $5::jsonb, 1)`,
    [milksId, cafeId, JSON.stringify(milksOptions), syrupsId, JSON.stringify(syrupsOptions)],
  );
}
