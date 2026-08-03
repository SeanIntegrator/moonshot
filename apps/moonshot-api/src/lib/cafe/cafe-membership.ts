import type { Pool, PoolClient } from 'pg';

type Db = Pool | PoolClient;

/**
 * Idempotent café membership row — required before loyalty ledger writes and
 * recommended before attaching `orders.user_id` for signed-in customers.
 */
export async function ensureCafeMembership(params: {
  db: Db;
  cafeId: string;
  userId: string;
}): Promise<void> {
  const { db, cafeId, userId } = params;
  await db.query(
    `INSERT INTO cafe_users (cafe_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [cafeId, userId],
  );
}
