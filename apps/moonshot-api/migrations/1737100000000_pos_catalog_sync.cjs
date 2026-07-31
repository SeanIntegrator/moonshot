/**
 * node-pg-migrate entry — runs SQL from 024_pos_catalog_sync.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(path.join(__dirname, 'sql', '024_pos_catalog_sync.sql'), 'utf8');
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE pos_connections DROP CONSTRAINT IF EXISTS pos_connections_catalog_sync_status_check;
    ALTER TABLE pos_connections DROP COLUMN IF EXISTS catalog_sync_error;
    ALTER TABLE pos_connections DROP COLUMN IF EXISTS catalog_sync_status;
    ALTER TABLE pos_connections DROP COLUMN IF EXISTS catalog_last_synced_at;
    ALTER TABLE pos_connections DROP COLUMN IF EXISTS catalog_sync_cursor;
  `);
};
