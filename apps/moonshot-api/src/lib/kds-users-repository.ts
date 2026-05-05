import { pool } from '../db.js';

export type KdsUserRow = {
  id: string;
  cafe_id: string;
  username: string;
  password_hash: string;
  display_name: string | null;
  is_active: boolean;
};

export async function findKdsUserForLogin(
  cafeId: string,
  username: string,
): Promise<KdsUserRow | null> {
  const { rows } = await pool.query<KdsUserRow>(
    `SELECT id, cafe_id, username, password_hash, display_name, is_active
     FROM kds_users
     WHERE cafe_id = $1 AND username = $2 AND is_active = TRUE`,
    [cafeId, username.trim()],
  );
  return rows[0] ?? null;
}

export async function touchKdsUserLogin(kdsUserId: string): Promise<void> {
  await pool.query(
    `UPDATE kds_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [kdsUserId],
  );
}
