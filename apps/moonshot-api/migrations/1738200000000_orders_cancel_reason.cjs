/**
 * node-pg-migrate entry — runs SQL from 035_orders_cancel_reason.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(
    path.join(__dirname, 'sql', '035_orders_cancel_reason.sql'),
    'utf8',
  );
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_cancel_reason_check;
    ALTER TABLE orders DROP COLUMN IF EXISTS cancel_reason;
  `);
};
