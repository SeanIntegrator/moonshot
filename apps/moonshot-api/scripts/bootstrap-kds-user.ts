/**
 * One-off: upsert a KDS user for a café. Reads secrets from environment only.
 * Usage (local): pnpm --filter @moonshot/api exec tsx --env-file-if-exists=.env scripts/bootstrap-kds-user.ts
 */
import pg from 'pg';
import { hashKdsPassword } from '../src/lib/kds-password.js';

const connectionString = process.env.DATABASE_URL;
const slug = process.env.KDS_BOOTSTRAP_CAFE_SLUG?.trim();
const username = process.env.KDS_BOOTSTRAP_USERNAME?.trim();
const password = process.env.KDS_BOOTSTRAP_PASSWORD;

async function main(): Promise<void> {
  if (!connectionString) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  if (!slug || !username || !password || password.length < 8) {
    console.error(
      'KDS_BOOTSTRAP_CAFE_SLUG, KDS_BOOTSTRAP_USERNAME, and KDS_BOOTSTRAP_PASSWORD (min 8 chars) are required',
    );
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
    const passwordHash = hashKdsPassword(password);

    await pool.query(
      `INSERT INTO kds_users (cafe_id, username, password_hash, display_name, is_active, updated_at)
       VALUES ($1, $2, $3, $4, TRUE, NOW())
       ON CONFLICT (cafe_id, username) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         is_active = TRUE,
         updated_at = NOW()`,
      [cafeId, username, passwordHash, `KDS ${username}`],
    );

    console.log(`KDS user upserted for café ${slug} / username ${username}`);
  } finally {
    await pool.end();
  }
}

void main();
