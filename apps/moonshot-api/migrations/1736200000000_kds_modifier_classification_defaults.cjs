/**
 * node-pg-migrate entry — runs SQL from 015_kds_modifier_classification_defaults.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(
    path.join(__dirname, 'sql', '015_kds_modifier_classification_defaults.sql'),
    'utf8',
  );
  pgm.sql(sql);
};

exports.down = () => {
  // Seed-only migration — no schema rollback.
};
