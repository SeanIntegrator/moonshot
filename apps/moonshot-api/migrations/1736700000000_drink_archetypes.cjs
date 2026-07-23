/**
 * node-pg-migrate entry — runs SQL from 021_drink_archetypes.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(path.join(__dirname, 'sql', '021_drink_archetypes.sql'), 'utf8');
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE menu_items DROP COLUMN IF EXISTS waive_milk_surcharge;
    ALTER TABLE menu_items DROP COLUMN IF EXISTS archetype;
    ALTER TABLE cafes DROP COLUMN IF EXISTS drink_archetype_config;
  `);
};
