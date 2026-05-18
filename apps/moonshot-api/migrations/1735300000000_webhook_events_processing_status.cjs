/**
 * node-pg-migrate entry — runs SQL from 006_webhook_events_processing_status.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(path.join(__dirname, 'sql', '006_webhook_events_processing_status.sql'), 'utf8');
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`ALTER TABLE webhook_events DROP CONSTRAINT IF EXISTS webhook_events_processing_status_check;`);
  pgm.sql(`ALTER TABLE webhook_events DROP COLUMN IF EXISTS updated_at;`);
  pgm.sql(`ALTER TABLE webhook_events DROP COLUMN IF EXISTS last_error;`);
  pgm.sql(`ALTER TABLE webhook_events DROP COLUMN IF EXISTS processing_status;`);
};
