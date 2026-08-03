import { randomBytes } from 'node:crypto';
import type { PoolClient } from 'pg';
import { hashKdsPassword } from '../kds-password.js';

export const DEFAULT_KDS_USERNAME = 'barista';

/** Generate a memorable-enough kitchen password (12 chars, alphanumeric). */
export function generateKitchenPassword(): string {
  // Avoid ambiguous chars (0/O, 1/l/I) for tablet entry.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = randomBytes(12);
  let out = '';
  for (let i = 0; i < 12; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

/**
 * Upsert an active KDS login for a café.
 * Returns the plaintext password only when this call generated one.
 */
export async function upsertKitchenLogin(
  client: PoolClient,
  cafeId: string,
  opts: { username?: string; password?: string } = {},
): Promise<{ username: string; password?: string }> {
  const username = (opts.username?.trim() || DEFAULT_KDS_USERNAME).slice(0, 64);
  if (username.length < 2) {
    throw new Error('username must be at least 2 characters');
  }

  const generated = !opts.password;
  const password = opts.password ?? generateKitchenPassword();
  if (password.length < 8) {
    throw new Error('password must be at least 8 characters');
  }

  const passwordHash = hashKdsPassword(password);
  await client.query(
    `INSERT INTO kds_users (cafe_id, username, password_hash, display_name, is_active, updated_at)
     VALUES ($1, $2, $3, $4, TRUE, NOW())
     ON CONFLICT (cafe_id, username) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       is_active = TRUE,
       updated_at = NOW()`,
    [cafeId, username, passwordHash, `KDS ${username}`],
  );

  return generated ? { username, password } : { username };
}

/** Seed the default barista login during café provisioning (password not returned). */
export async function seedDefaultKitchenLogin(
  client: PoolClient,
  cafeId: string,
): Promise<void> {
  await upsertKitchenLogin(client, cafeId, { username: DEFAULT_KDS_USERNAME });
}
