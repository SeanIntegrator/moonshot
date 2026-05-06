/**
 * One-off: upsert a pre-seeded admin user for a café. Reads secrets from environment only.
 * Usage (local): pnpm --filter @moonshot/api exec tsx --env-file-if-exists=.env scripts/bootstrap-admin-user.ts
 */
import pg from 'pg';
import { hashKdsPassword } from '../src/lib/kds-password.js';

const connectionString = process.env.DATABASE_URL;
const slug = process.env.ADMIN_BOOTSTRAP_CAFE_SLUG?.trim();
const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;

async function main(): Promise<void> {
  if (!connectionString) {
    console.error('DATABASE_URL is required');
    process.exit(1);
  }
  if (!slug || !email || !password || password.length < 8) {
    console.error(
      'ADMIN_BOOTSTRAP_CAFE_SLUG, ADMIN_BOOTSTRAP_EMAIL, and ADMIN_BOOTSTRAP_PASSWORD (min 8 chars) are required',
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
      `INSERT INTO admin_users (cafe_id, email, password_hash, display_name, is_active, updated_at)
       VALUES ($1, $2, $3, $4, TRUE, NOW())
       ON CONFLICT (cafe_id, email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         is_active = TRUE,
         updated_at = NOW()`,
      [cafeId, email, passwordHash, `Admin ${email}`],
    );

    console.log(`Admin user upserted for café ${slug} / email ${email}`);
  } finally {
    await pool.end();
  }
}

void main();
