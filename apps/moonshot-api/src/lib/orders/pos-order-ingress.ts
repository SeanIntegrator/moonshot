import type { NormalisedOrder, NormalisedOrderItem } from '@moonshot/types';
import type { NormalisedWebhookEvent } from '@moonshot/domain';
import type { Pool, PoolClient } from 'pg';
import { pool } from '../../db.js';
import type { OrderRowDb } from '../order-map.js';
import { ORDER_SELECT_COLUMNS } from './order-constants.js';
import { fetchOrderWithItems } from './order-read.js';
import { emitKdsServerToClient } from '../../realtime/kds-events.js';

type Db = Pool | PoolClient;

export type PersistPosOrderResult =
  | { kind: 'created'; order: NormalisedOrder }
  | { kind: 'updated'; order: NormalisedOrder }
  | { kind: 'removed'; orderId: string | null; posOrderId: string }
  | { kind: 'ignored'; reason: string };

type SnapshotLine = Pick<
  NormalisedOrderItem,
  | 'itemName'
  | 'quantity'
  | 'unitPriceMinor'
  | 'modifiers'
  | 'allergens'
  | 'notes'
  | 'category'
  | 'menuItemId'
>;

/** Trim free-text notes; empty / whitespace-only → null. */
function nonemptyNote(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

async function replaceOrderItems(
  client: PoolClient,
  orderId: string,
  items: SnapshotLine[],
): Promise<void> {
  await client.query(`DELETE FROM order_items WHERE order_id = $1`, [orderId]);
  for (const item of items) {
    await client.query(
      `INSERT INTO order_items (
        order_id, menu_item_id, item_name, quantity, unit_price_minor,
        modifiers, allergens, notes, category
      ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)`,
      [
        orderId,
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
}

async function findByPosOrderId(
  db: Db,
  cafeId: string,
  posOrderId: string,
  forUpdate = false,
): Promise<OrderRowDb | null> {
  const { rows } = await db.query<OrderRowDb>(
    `SELECT ${ORDER_SELECT_COLUMNS} FROM orders
     WHERE cafe_id = $1 AND pos_order_id = $2
     LIMIT 1
     ${forUpdate ? 'FOR UPDATE' : ''}`,
    [cafeId, posOrderId],
  );
  return rows[0] ?? null;
}

/**
 * Persist a normalised POS webhook event.
 * Relies on unique (cafe_id, pos_order_id) for dedupe; emits KDS new/updated/removed.
 */
export async function persistPosOrderEvent(
  event: NormalisedWebhookEvent,
  db: Pool = pool,
): Promise<PersistPosOrderResult> {
  if (event.kind === 'ignored') {
    return { kind: 'ignored', reason: event.reason };
  }

  if (event.kind === 'order_removed') {
    const existing = await findByPosOrderId(db, event.cafeId, event.posOrderId);
    if (!existing) {
      return { kind: 'removed', orderId: null, posOrderId: event.posOrderId };
    }

    await db.query(
      `UPDATE orders
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1 AND cafe_id = $2
         AND status NOT IN ('completed', 'cancelled')`,
      [existing.id, event.cafeId],
    );
    emitKdsServerToClient(event.cafeId, { type: 'kds:order:removed', orderId: existing.id });
    return { kind: 'removed', orderId: existing.id, posOrderId: event.posOrderId };
  }

  const snap = event.snapshot ?? {};
  const customerName =
    typeof snap.customerName === 'string' && snap.customerName.trim()
      ? snap.customerName.trim().slice(0, 120)
      : 'POS Guest';
  const notes = nonemptyNote(snap.notes);
  const orderType = snap.orderType === 'eat_in' ? 'eat_in' : 'takeaway';
  const paymentStatus = snap.paymentStatus === 'paid' ? 'paid' : 'unpaid';
  const totalMinor = typeof snap.totalMinor === 'number' ? Math.max(0, snap.totalMinor) : 0;
  const currency =
    typeof snap.currency === 'string' && snap.currency.trim()
      ? snap.currency.trim().toUpperCase()
      : 'GBP';
  const items: SnapshotLine[] = Array.isArray(snap.items)
    ? snap.items.map((it) => ({
        menuItemId: it.menuItemId ?? null,
        itemName: it.itemName || 'Item',
        quantity: Math.max(1, it.quantity || 1),
        unitPriceMinor: Math.max(0, it.unitPriceMinor || 0),
        modifiers: it.modifiers ?? [],
        allergens: it.allergens ?? [],
        notes: nonemptyNote(it.notes),
        category: it.category ?? null,
      }))
    : [];

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const existing = await findByPosOrderId(client, event.cafeId, event.posOrderId, true);

    let orderRow: OrderRowDb;
    let created: boolean;

    if (existing) {
      if (existing.status === 'completed' || existing.status === 'cancelled') {
        await client.query('COMMIT');
        const full = await fetchOrderWithItems(db, existing.id, event.cafeId);
        if (!full) return { kind: 'ignored', reason: 'terminal_order_missing' };
        return { kind: 'updated', order: full };
      }

      const updated = await client.query<OrderRowDb>(
        `UPDATE orders SET
           customer_name = $1,
           notes = $2,
           total_minor = $3,
           currency = $4,
           order_type = $5,
           payment_status = $6,
           source = 'pos',
           status = CASE
             WHEN status IN ('confirmed', 'preparing', 'ready') THEN status
             ELSE 'confirmed'
           END,
           updated_at = NOW()
         WHERE id = $7 AND cafe_id = $8
         RETURNING ${ORDER_SELECT_COLUMNS}`,
        [
          customerName,
          notes,
          totalMinor,
          currency,
          orderType,
          paymentStatus,
          existing.id,
          event.cafeId,
        ],
      );
      orderRow = updated.rows[0]!;
      await replaceOrderItems(client, orderRow.id, items);
      created = false;
    } else {
      const inserted = await client.query<OrderRowDb>(
        `INSERT INTO orders (
           cafe_id, user_id, pos_order_id, customer_name, notes, total_minor, currency,
           order_type, source, status, payment_status
         ) VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, 'pos', 'confirmed', $8)
         RETURNING ${ORDER_SELECT_COLUMNS}`,
        [
          event.cafeId,
          event.posOrderId,
          customerName,
          notes,
          totalMinor,
          currency,
          orderType,
          paymentStatus,
        ],
      );
      orderRow = inserted.rows[0]!;
      await replaceOrderItems(client, orderRow.id, items);
      created = true;
    }

    await client.query('COMMIT');

    const full = await fetchOrderWithItems(db, orderRow.id, event.cafeId);
    if (!full) {
      return { kind: 'ignored', reason: 'order_load_failed' };
    }

    if (created) {
      emitKdsServerToClient(event.cafeId, { type: 'kds:order:new', order: full });
      return { kind: 'created', order: full };
    }
    emitKdsServerToClient(event.cafeId, { type: 'kds:order:updated', order: full });
    return { kind: 'updated', order: full };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
