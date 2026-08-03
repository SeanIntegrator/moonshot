import type { Pool, PoolClient } from 'pg';

type Db = Pool | PoolClient;

export type GoogleUserUpsertInput = {
  googleId: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type UserRow = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
};

/** Upsert by email; refreshes Google profile fields when present. */
export async function upsertGoogleUser(db: Db, input: GoogleUserUpsertInput): Promise<UserRow> {
  const result = await db.query<UserRow>(
    `INSERT INTO users (google_id, email, display_name, avatar_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO UPDATE
     SET
       google_id = COALESCE(EXCLUDED.google_id, users.google_id),
       display_name = COALESCE(EXCLUDED.display_name, users.display_name),
       avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url)
     RETURNING id, email, display_name, avatar_url`,
    [input.googleId, input.email, input.displayName, input.avatarUrl],
  );
  return result.rows[0]!;
}

/** Idempotent café membership for a signed-in customer. */
export async function ensureCafeUserMembership(
  db: Db,
  cafeId: string,
  userId: string,
): Promise<void> {
  await db.query(
    `INSERT INTO cafe_users (cafe_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [cafeId, userId],
  );
}

export async function findUserById(db: Db, userId: string): Promise<UserRow | null> {
  const result = await db.query<UserRow>(
    `SELECT id, email, display_name, avatar_url FROM users WHERE id = $1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

export type CafeMembershipProfileRow = {
  loyalty_card_progress: number;
  loyalty_display_id: string;
  total_orders: number;
  on_time_completed_orders: number;
  review_prompt_state: string;
  first_visit: string;
  free_drinks_redeemed: number;
};

export async function findCafeMembershipProfile(
  db: Db,
  cafeId: string,
  userId: string,
): Promise<CafeMembershipProfileRow | null> {
  const membership = await db.query<CafeMembershipProfileRow>(
    `SELECT cu.loyalty_card_progress, cu.loyalty_display_id, cu.total_orders,
            cu.on_time_completed_orders, cu.review_prompt_state, cu.first_visit,
            (SELECT COUNT(*)::int FROM loyalty_rewards lr
             WHERE lr.cafe_id = cu.cafe_id AND lr.user_id = cu.user_id AND lr.redeemed_at IS NOT NULL) AS free_drinks_redeemed
     FROM cafe_users cu
     WHERE cu.cafe_id = $1 AND cu.user_id = $2`,
    [cafeId, userId],
  );
  return membership.rows[0] ?? null;
}
