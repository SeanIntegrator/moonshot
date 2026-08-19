import type { Pool } from 'pg';

/**
 * Loyalty checkout keys must match the customer menu (`menu_sections.kind`).
 * `kds_config.foodSectionKeys` is a KDS mirror and can lag (e.g. after
 * migration 034 reclassified Square food heuristics to unclassified).
 */
export async function loadFoodSectionKeysForCafe(
  db: Pool,
  cafeId: string,
): Promise<string[]> {
  const { rows } = await db.query<{ key: string }>(
    `SELECT key FROM menu_sections WHERE cafe_id = $1 AND kind = 'food' ORDER BY sort_order, label`,
    [cafeId],
  );
  return rows.map((r) => r.key);
}
