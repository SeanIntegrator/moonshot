import type { LoyaltyTransaction, LoyaltyTransactionType } from '@moonshot/types';
import type { Pool, PoolClient } from 'pg';

export async function insertStampEarnIfAbsent(params: {
  client: PoolClient;
  cafeId: string;
  userId: string;
  orderId: string;
  stampsDelta: number;
  metadata: Record<string, unknown>;
}): Promise<{ inserted: boolean; transactionId: string | null }> {
  const { client, cafeId, userId, orderId, stampsDelta, metadata } = params;

  try {
    const ins = await client.query<{ id: string }>(
      `INSERT INTO loyalty_transactions (
         cafe_id, user_id, order_id, transaction_type, stamps_delta, metadata
       ) VALUES ($1, $2, $3, 'stamp_earned', $4, $5::jsonb)
       RETURNING id`,
      [cafeId, userId, orderId, stampsDelta, JSON.stringify(metadata)],
    );
    const row = ins.rows[0];
    return { inserted: row != null, transactionId: row?.id ?? null };
  } catch (e: unknown) {
    if (
      e &&
      typeof e === 'object' &&
      'code' in e &&
      (e as { code?: string }).code === '23505'
    ) {
      return { inserted: false, transactionId: null };
    }
    throw e;
  }
}

export async function insertRewardEarned(params: {
  client: PoolClient;
  cafeId: string;
  userId: string;
  orderId: string | null;
  rewardId: string;
}): Promise<string> {
  const { client, cafeId, userId, orderId, rewardId } = params;
  const ins = await client.query<{ id: string }>(
    `INSERT INTO loyalty_transactions (
       cafe_id, user_id, order_id, transaction_type, stamps_delta, metadata
     ) VALUES ($1, $2, $3, 'reward_earned', 0, $4::jsonb)
     RETURNING id`,
    [cafeId, userId, orderId, JSON.stringify({ rewardId })],
  );
  return ins.rows[0]!.id;
}

export async function insertRewardRedeemed(params: {
  client: PoolClient;
  cafeId: string;
  userId: string;
  rewardId: string;
}): Promise<{ id: string; createdAt: string }> {
  const { client, cafeId, userId, rewardId } = params;
  const ins = await client.query<{ id: string; created_at: Date }>(
    `INSERT INTO loyalty_transactions (
       cafe_id, user_id, order_id, transaction_type, stamps_delta, metadata
     ) VALUES ($1, $2, NULL, 'reward_redeemed', 0, $3::jsonb)
     RETURNING id, created_at`,
    [cafeId, userId, JSON.stringify({ rewardId })],
  );
  const row = ins.rows[0]!;
  return { id: row.id, createdAt: row.created_at.toISOString() };
}

export async function insertLoyaltyRewardRow(params: {
  client: PoolClient;
  cafeId: string;
  userId: string;
  rewardType: string;
  metadata: Record<string, unknown>;
}): Promise<string> {
  const { client, cafeId, userId, rewardType, metadata } = params;
  const ins = await client.query<{ id: string }>(
    `INSERT INTO loyalty_rewards (cafe_id, user_id, reward_type, metadata)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING id`,
    [cafeId, userId, rewardType, JSON.stringify(metadata)],
  );
  return ins.rows[0]!.id;
}

export async function lockMembershipRow(params: {
  client: PoolClient;
  cafeId: string;
  userId: string;
}): Promise<{ loyaltyStamps: number } | null> {
  const res = await params.client.query<{ loyalty_stamps: number }>(
    `SELECT loyalty_stamps FROM cafe_users WHERE cafe_id = $1 AND user_id = $2 FOR UPDATE`,
    [params.cafeId, params.userId],
  );
  if (res.rows.length === 0) return null;
  return { loyaltyStamps: res.rows[0]!.loyalty_stamps };
}

export async function fetchLoyaltyTransactionsPage(params: {
  pool: Pool | PoolClient;
  cafeId: string;
  userId: string;
  limit: number;
  cursorCreatedAt?: string | null;
}): Promise<{ transactions: LoyaltyTransaction[]; nextCursor: string | null }> {
  const { pool, cafeId, userId, limit, cursorCreatedAt } = params;
  const pageSize = Math.min(Math.max(limit, 1), 50);
  const args: unknown[] = [cafeId, userId, pageSize + 1];
  let cursorClause = '';
  if (cursorCreatedAt?.trim()) {
    cursorClause = 'AND created_at < $4::timestamptz';
    args.push(cursorCreatedAt.trim());
  }

  const res = await pool.query<{
    id: string;
    cafe_id: string;
    user_id: string;
    order_id: string | null;
    transaction_type: LoyaltyTransactionType;
    stamps_delta: number;
    metadata: unknown;
    created_at: Date;
  }>(
    `SELECT id, cafe_id, user_id, order_id, transaction_type, stamps_delta, metadata, created_at
     FROM loyalty_transactions
     WHERE cafe_id = $1 AND user_id = $2 ${cursorClause}
     ORDER BY created_at DESC
     LIMIT $3`,
    args,
  );

  const rows = res.rows.slice(0, pageSize);
  const nextCursor =
    res.rows.length > pageSize ? rows[rows.length - 1]!.created_at.toISOString() : null;

  const transactions: LoyaltyTransaction[] = rows.map((r) => ({
    id: r.id,
    cafeId: r.cafe_id,
    userId: r.user_id,
    orderId: r.order_id,
    transactionType: r.transaction_type,
    stampsDelta: r.stamps_delta,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: r.created_at.toISOString(),
  }));

  return { transactions, nextCursor };
}

export async function countUnredeemedRewards(params: {
  pool: Pool | PoolClient;
  cafeId: string;
  userId: string;
}): Promise<number> {
  const res = await params.pool.query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM loyalty_rewards
     WHERE cafe_id = $1 AND user_id = $2 AND redeemed_at IS NULL`,
    [params.cafeId, params.userId],
  );
  return Number.parseInt(res.rows[0]?.c ?? '0', 10) || 0;
}

export async function listUnredeemedRewards(params: {
  pool: Pool | PoolClient;
  cafeId: string;
  userId: string;
}): Promise<
  Array<{
    id: string;
    cafe_id: string;
    user_id: string;
    reward_type: string;
    redeemed_at: Date | null;
    expires_at: Date | null;
    metadata: unknown;
    created_at: Date;
  }>
> {
  const res = await params.pool.query(
    `SELECT id, cafe_id, user_id, reward_type, redeemed_at, expires_at, metadata, created_at
     FROM loyalty_rewards
     WHERE cafe_id = $1 AND user_id = $2 AND redeemed_at IS NULL
     ORDER BY created_at ASC`,
    [params.cafeId, params.userId],
  );
  return res.rows as Array<{
    id: string;
    cafe_id: string;
    user_id: string;
    reward_type: string;
    redeemed_at: Date | null;
    expires_at: Date | null;
    metadata: unknown;
    created_at: Date;
  }>;
}
