/**
 * node-pg-migrate entry - runs SQL from 011_menu_syrup_modifiers.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

const SYRUP_GROUP_ID = '11111111-1111-4111-8111-111111111104';

exports.up = (pgm) => {
  const sql = fs.readFileSync(path.join(__dirname, 'sql', '011_menu_syrup_modifiers.sql'), 'utf8');
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`
    UPDATE menu_items mi
    SET modifier_groups = COALESCE(
      (
        SELECT jsonb_agg(modifier_group)
        FROM jsonb_array_elements(COALESCE(mi.modifier_groups, '[]'::jsonb)) AS modifier_group
        WHERE modifier_group->>'id' <> '${SYRUP_GROUP_ID}'
      ),
      '[]'::jsonb
    )
    FROM cafes c
    WHERE mi.cafe_id = c.id
      AND c.slug = 'clay-and-bean'
      AND mi.name IN ('Flat White', 'Cortado', 'Iced latte');
  `);
};
