/**
 * node-pg-migrate entry — runs SQL from 034_modifier_slot_and_section_kind.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(
    path.join(__dirname, 'sql', '034_modifier_slot_and_section_kind.sql'),
    'utf8',
  );
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE modifier_groups DROP CONSTRAINT IF EXISTS modifier_groups_slot_check;
    ALTER TABLE modifier_groups DROP COLUMN IF EXISTS slot;
    ALTER TABLE menu_sections DROP CONSTRAINT IF EXISTS menu_sections_kind_check;
    ALTER TABLE menu_sections
      ADD CONSTRAINT menu_sections_kind_check CHECK (kind IN ('drink', 'food'));
  `);
};
