/**
 * node-pg-migrate entry - runs SQL from 012_menu_modifier_library.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(path.join(__dirname, 'sql', '012_menu_modifier_library.sql'), 'utf8');
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS menu_item_modifier_groups CASCADE;
    DROP TABLE IF EXISTS modifier_groups CASCADE;
    ALTER TABLE menu_items DROP COLUMN IF EXISTS sizes;
  `);
};
