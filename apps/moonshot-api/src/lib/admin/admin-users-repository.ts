import { pool } from '../db.js';

export type AdminUserRow = {
  id: string;
  cafe_id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  is_active: boolean;
};

/** All active rows matching normalized email (dedupe / ambiguity handled in route). */
export async function findActiveAdminUsersByEmailNormalized(
  normalizedEmail: string,
): Promise<AdminUserRow[]> {
  const email = normalizedEmail.trim().toLowerCase();
  if (!email) return [];
  const { rows } = await pool.query<AdminUserRow>(
    `SELECT id, cafe_id, email, password_hash, display_name, is_active
     FROM admin_users
     WHERE lower(trim(email)) = $1 AND is_active = TRUE`,
    [email],
  );
  return rows;
}

export async function touchAdminUserLogin(adminUserId: string): Promise<void> {
  await pool.query(
    `UPDATE admin_users SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [adminUserId],
  );
}

export type AdminUserWithCafeRow = AdminUserRow & {
  cafe_slug: string;
  cafe_name: string;
};

export async function getAdminUserWithCafeById(
  adminUserId: string,
): Promise<AdminUserWithCafeRow | null> {
  const { rows } = await pool.query<AdminUserWithCafeRow>(
    `SELECT
      au.id,
      au.cafe_id,
      au.email,
      au.password_hash,
      au.display_name,
      au.is_active,
      c.slug AS cafe_slug,
      c.name AS cafe_name
     FROM admin_users au
     INNER JOIN cafes c ON c.id = au.cafe_id
     WHERE au.id = $1 AND au.is_active = TRUE`,
    [adminUserId],
  );
  return rows[0] ?? null;
}
