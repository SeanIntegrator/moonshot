/**
 * node-pg-migrate entry — runs SQL from 027_menu_item_default_image.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(
    path.join(__dirname, 'sql', '027_menu_item_default_image.sql'),
    'utf8',
  );
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE menu_items
      DROP COLUMN IF EXISTS image_source,
      DROP COLUMN IF EXISTS use_default_image;
  `);
};
