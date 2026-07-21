/**
 * node-pg-migrate entry — runs SQL from 016_orders_eta_mode.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(path.join(__dirname, 'sql', '016_orders_eta_mode.sql'), 'utf8');
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_eta_mode_check;
    ALTER TABLE orders DROP COLUMN IF EXISTS eta_mode;
  `);
};
