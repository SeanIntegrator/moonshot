/**
 * node-pg-migrate entry — runs SQL from 026_pos_prep_optin.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(path.join(__dirname, 'sql', '026_pos_prep_optin.sql'), 'utf8');
  pgm.sql(sql);
};

exports.down = (pgm) => {
  // Irreversible data migration — prep attachments cannot be reconstructed.
  pgm.sql(`SELECT 1`);
};
