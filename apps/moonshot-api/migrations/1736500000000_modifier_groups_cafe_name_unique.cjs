/**
 * node-pg-migrate entry — runs SQL from 018_modifier_groups_cafe_name_unique.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(
    path.join(__dirname, 'sql', '018_modifier_groups_cafe_name_unique.sql'),
    'utf8',
  );
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS modifier_groups_cafe_name_unique;`);
};
