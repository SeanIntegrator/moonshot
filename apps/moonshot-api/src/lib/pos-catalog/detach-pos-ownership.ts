import type { Pool, PoolClient } from 'pg';

type Db = Pool | PoolClient;

/**
 * After Square disconnect, keep the imported snapshot but drop POS ownership
 * so Admin treats items/lists as locally editable (no "From Square" lock).
 */
export async function detachPosCatalogOwnership(db: Db, cafeId: string): Promise<void> {
  await db.query(
    `UPDATE menu_items
     SET pos_item_id = NULL
     WHERE cafe_id = $1 AND pos_item_id IS NOT NULL`,
    [cafeId],
  );
  await db.query(
    `UPDATE modifier_groups
     SET pos_group_id = NULL, updated_at = NOW()
     WHERE cafe_id = $1 AND pos_group_id IS NOT NULL`,
    [cafeId],
  );
  await db.query(
    `UPDATE menu_sections
     SET pos_category_id = NULL, updated_at = NOW()
     WHERE cafe_id = $1 AND pos_category_id IS NOT NULL`,
    [cafeId],
  );
}
