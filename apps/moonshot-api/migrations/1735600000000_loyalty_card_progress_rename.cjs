/**
 * node-pg-migrate entry — runs SQL from 009_loyalty_card_progress_rename.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(path.join(__dirname, 'sql', '009_loyalty_card_progress_rename.sql'), 'utf8');
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`ALTER TABLE cafe_users RENAME COLUMN loyalty_card_progress TO loyalty_stamps;`);
};
