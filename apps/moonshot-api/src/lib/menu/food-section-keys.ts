import type { Pool } from 'pg';

/** Load food section keys mirrored from menu_sections.kind for loyalty checkout. */
export async function loadFoodSectionKeysForCafe(
  db: Pool,
  cafeId: string,
): Promise<string[]> {
  const { rows: cafeRows } = await db.query<{ kds_config: Record<string, unknown> }>(
    `SELECT kds_config FROM cafes WHERE id = $1`,
    [cafeId],
  );
  const fromConfig = cafeRows[0]?.kds_config?.foodSectionKeys;
  if (Array.isArray(fromConfig) && fromConfig.every((k) => typeof k === 'string')) {
    return fromConfig as string[];
  }

  const { rows } = await db.query<{ key: string }>(
    `SELECT key FROM menu_sections WHERE cafe_id = $1 AND kind = 'food' ORDER BY sort_order, label`,
    [cafeId],
  );
  return rows.map((r) => r.key);
}
