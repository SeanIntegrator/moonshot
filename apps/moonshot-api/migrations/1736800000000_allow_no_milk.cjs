/**
 * node-pg-migrate entry — runs SQL from 022_allow_no_milk.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(path.join(__dirname, 'sql', '022_allow_no_milk.sql'), 'utf8');
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`ALTER TABLE menu_items DROP COLUMN IF EXISTS allow_no_milk;`);
};
