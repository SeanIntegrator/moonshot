/**
 * node-pg-migrate entry — runs SQL from 005_payment_webhook_schema.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(path.join(__dirname, 'sql', '005_payment_webhook_schema.sql'), 'utf8');
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS webhook_events CASCADE;`);
  pgm.sql(`DROP TABLE IF EXISTS payment_sessions CASCADE;`);
};
