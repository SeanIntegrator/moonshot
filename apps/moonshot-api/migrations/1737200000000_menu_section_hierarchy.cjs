/**
 * node-pg-migrate entry — runs SQL from 025_menu_section_hierarchy.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(path.join(__dirname, 'sql', '025_menu_section_hierarchy.sql'), 'utf8');
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS menu_sections_parent_id_idx;
    DROP INDEX IF EXISTS menu_sections_cafe_pos_category_id_uidx;
    ALTER TABLE menu_sections DROP CONSTRAINT IF EXISTS menu_sections_kind_check;
    ALTER TABLE menu_sections DROP COLUMN IF EXISTS kind;
    ALTER TABLE menu_sections DROP COLUMN IF EXISTS pos_category_id;
    ALTER TABLE menu_sections DROP COLUMN IF EXISTS parent_id;
  `);
};
