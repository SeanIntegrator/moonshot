/**
 * node-pg-migrate entry — runs SQL from 017_flow_kds_modifiers.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(path.join(__dirname, 'sql', '017_flow_kds_modifiers.sql'), 'utf8');
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE order_items DROP COLUMN IF EXISTS category;
  `);
};
