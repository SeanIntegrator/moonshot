/**
 * node-pg-migrate entry — runs SQL from 014_cafes_hours.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(path.join(__dirname, 'sql', '014_cafes_hours.sql'), 'utf8');
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`ALTER TABLE cafes DROP COLUMN IF EXISTS hours;`);
};
