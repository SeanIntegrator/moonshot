/**
 * node-pg-migrate entry — runs SQL from 013_orders_requested_pickup_not_before.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(
    path.join(__dirname, 'sql', '013_orders_requested_pickup_not_before.sql'),
    'utf8',
  );
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`ALTER TABLE orders DROP COLUMN IF EXISTS requested_pickup_not_before;`);
};
