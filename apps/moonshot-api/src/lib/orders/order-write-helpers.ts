import { ApiErrorCode } from '@moonshot/types';
import type { PoolClient } from 'pg';
import { ApiHttpError } from '../http-errors.js';
import type { OrderRowDb } from '../order-map.js';
import type { ResolvedOrderLine } from '../order-modifiers.js';

/** Insert line rows for an order inside an open transaction. */
export async function insertOrderItems(
  client: PoolClient,
  orderId: string,
  resolvedLines: ResolvedOrderLine[],
): Promise<void> {
  for (const rl of resolvedLines) {
    await client.query(
      `INSERT INTO order_items (
        order_id, menu_item_id, item_name, quantity, unit_price_minor,
        modifiers, allergens, notes
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)`,
      [
        orderId,
        rl.menuItemId,
        rl.itemName,
        rl.quantity,
        rl.unitPriceMinor,
        JSON.stringify(rl.modifiers),
        rl.allergens,
        rl.notes,
      ],
    );
  }
}

export function requireInsertedOrderRow(row: OrderRowDb | undefined): OrderRowDb {
  if (!row) {
    throw new ApiHttpError(500, ApiErrorCode.INTERNAL, 'Failed to create order');
  }
  return row;
}
