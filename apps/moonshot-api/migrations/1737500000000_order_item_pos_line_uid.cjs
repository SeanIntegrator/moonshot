/**
 * node-pg-migrate entry — runs SQL from 028_order_item_pos_line_uid.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(
    path.join(__dirname, 'sql', '028_order_item_pos_line_uid.sql'),
    'utf8',
  );
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE order_items
      DROP CONSTRAINT IF EXISTS order_items_order_id_pos_line_uid_key,
      DROP COLUMN IF EXISTS pos_line_uid;
    ALTER TABLE orders
      DROP COLUMN IF EXISTS details_pending;
  `);
};
