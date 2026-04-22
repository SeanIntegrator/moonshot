import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn('@moonshot/api: DATABASE_URL is not set — DB routes will fail until configured.');
}

export const pool = new pg.Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});
