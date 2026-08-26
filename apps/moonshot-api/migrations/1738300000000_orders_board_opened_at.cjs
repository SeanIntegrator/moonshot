/**
 * node-pg-migrate entry — runs SQL from 036_orders_board_opened_at.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(
    path.join(__dirname, 'sql', '036_orders_board_opened_at.sql'),
    'utf8',
  );
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_orders_cafe_status_board_opened;
    ALTER TABLE orders DROP COLUMN IF EXISTS board_opened_at;
  `);
};
