/**
 * Ops: replay loyalty ledger + counters for a completed app order (idempotent).
 *
 * Usage:
 *   DATABASE_URL='…' REPLAY_CAFE_SLUG=bobo REPLAY_ORDER_ID='<uuid>' \
 *     pnpm --filter @moonshot/api replay:order-loyalty
 */
import pg from 'pg';
import { replayLoyaltyForCompletedOrder } from '../src/lib/loyalty-after-kds-complete.js';

const connectionString = process.env.DATABASE_URL;
const slug = process.env.REPLAY_CAFE_SLUG?.trim();
const orderId = process.env.REPLAY_ORDER_ID?.trim();

async function main(): Promise<void> {
  if (!connectionString) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  if (!slug || !orderId) {
    console.error('REPLAY_CAFE_SLUG and REPLAY_ORDER_ID are required');
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString });
  try {
    const cafe = await pool.query<{ id: string }>(`SELECT id FROM cafes WHERE slug = $1`, [slug]);
    if (cafe.rows.length === 0) {
      console.error(`Café not found for slug: ${slug}`);
      process.exit(1);
    }
    const cafeId = cafe.rows[0]!.id;

    const order = await pool.query<{ user_id: string | null; status: string; payment_status: string }>(
      `SELECT user_id, status, payment_status FROM orders WHERE id = $1 AND cafe_id = $2`,
      [orderId, cafeId],
    );
    if (order.rows.length === 0) {
      console.error('Order not found for café');
      process.exit(1);
    }
    const row = order.rows[0]!;
    if (!row.user_id) {
      console.error('Order has no user_id — attach the signed-in customer before replaying loyalty');
      process.exit(1);
    }

    const ok = await replayLoyaltyForCompletedOrder({ cafeId, orderId });
    if (!ok) {
      console.error('Order is not completed — loyalty replay skipped');
      process.exit(1);
    }

    console.log('Loyalty replay completed', {
      cafeSlug: slug,
      orderId,
      paymentStatus: row.payment_status,
    });
  } finally {
    await pool.end();
  }
}

void main();
