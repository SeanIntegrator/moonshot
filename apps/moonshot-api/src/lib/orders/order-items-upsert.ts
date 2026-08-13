import type { NormalisedOrderItem } from '@moonshot/types';
import type { PoolClient } from 'pg';

export type UpsertSnapshotLine = Pick<
  NormalisedOrderItem,
  | 'itemName'
  | 'quantity'
  | 'unitPriceMinor'
  | 'modifiers'
  | 'allergens'
  | 'notes'
  | 'category'
  | 'menuItemId'
> & {
  posLineUid: string;
};

/**
 * Upsert POS snapshot lines by (order_id, pos_line_uid) and drop lines that
 * disappeared from the snapshot. `order_items.id` is preserved on conflict
 * so KDS made-state survives Square webhooks.
 */
export async function upsertOrderItems(
  client: PoolClient,
  orderId: string,
  items: UpsertSnapshotLine[],
): Promise<void> {
  const uids = items.map((item) => item.posLineUid);
  for (const item of items) {
    await client.query(
      `INSERT INTO order_items (
        order_id, pos_line_uid, menu_item_id, item_name, quantity, unit_price_minor,
        modifiers, allergens, notes, category
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)
      ON CONFLICT (order_id, pos_line_uid) DO UPDATE SET
        menu_item_id = EXCLUDED.menu_item_id,
        item_name = EXCLUDED.item_name,
        quantity = EXCLUDED.quantity,
        unit_price_minor = EXCLUDED.unit_price_minor,
        modifiers = EXCLUDED.modifiers,
        allergens = EXCLUDED.allergens,
        notes = EXCLUDED.notes,
        category = EXCLUDED.category`,
      [
        orderId,
        item.posLineUid,
        item.menuItemId ?? null,
        item.itemName,
        item.quantity,
        item.unitPriceMinor,
        JSON.stringify(item.modifiers ?? []),
        item.allergens ?? [],
        item.notes ?? null,
        item.category ?? null,
      ],
    );
  }

  if (uids.length === 0) {
    await client.query(`DELETE FROM order_items WHERE order_id = $1`, [orderId]);
    return;
  }

  await client.query(
    `DELETE FROM order_items WHERE order_id = $1 AND pos_line_uid <> ALL($2::text[])`,
    [orderId, uids],
  );
}
