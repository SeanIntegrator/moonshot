/**
 * node-pg-migrate entry — runs SQL from 031_theme_packs_three.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(
    path.join(__dirname, 'sql', '031_theme_packs_three.sql'),
    'utf8',
  );
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`ALTER TABLE cafes ALTER COLUMN theme_id SET DEFAULT 'organic';`);
};
