import pg from 'pg';
import { config } from './lib/config.js';

if (!config.databaseUrl) {
  // Warning already emitted by loadConfig() in non-production.
}

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});
