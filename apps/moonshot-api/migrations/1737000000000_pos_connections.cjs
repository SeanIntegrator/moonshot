/**
 * node-pg-migrate entry — runs SQL from 023_pos_connections.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(path.join(__dirname, 'sql', '023_pos_connections.sql'), 'utf8');
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS modifier_groups_cafe_pos_group_unique;
    ALTER TABLE modifier_groups DROP COLUMN IF EXISTS pos_group_id;
    DROP TABLE IF EXISTS pos_connections;
  `);
};
