/**
 * node-pg-migrate entry — runs SQL from 008_menu_seed_dev.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(path.join(__dirname, 'sql', '008_menu_seed_dev.sql'), 'utf8');
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`
    DELETE FROM menu_items
    WHERE cafe_id = (SELECT id FROM cafes WHERE slug = 'clay-and-bean')
      AND name IN (
        'Espresso',
        'Cortado',
        'Americano',
        'Iced latte',
        'House filter',
        'English breakfast',
        'Almond croissant',
        'Pain au chocolat',
        'Oat cookie'
      );
  `);
  pgm.sql(`
    UPDATE cafes
    SET features = jsonb_set(COALESCE(features, '{}'::jsonb), '{loyalty}', 'null'::jsonb, TRUE)
    WHERE slug = 'clay-and-bean';
  `);
  pgm.sql(`
    UPDATE menu_items mi
    SET subcategory = NULL,
      description = 'Double shot, steamed milk',
      modifier_groups = '[]'::jsonb,
      sort_order = 0
    FROM cafes c
    WHERE mi.cafe_id = c.id AND c.slug = 'clay-and-bean' AND mi.name = 'Flat White';
  `);
};
