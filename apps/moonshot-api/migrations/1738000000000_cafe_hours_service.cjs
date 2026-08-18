/**
 * node-pg-migrate entry — runs SQL from 033_cafe_hours_service.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(
    path.join(__dirname, 'sql', '033_cafe_hours_service.sql'),
    'utf8',
  );
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS cafe_hours_overrides;
    ALTER TABLE cafes DROP CONSTRAINT IF EXISTS cafes_last_order_buffer_minutes_chk;
    ALTER TABLE cafes DROP COLUMN IF EXISTS last_order_buffer_minutes;
    ALTER TABLE cafes DROP COLUMN IF EXISTS paused_until;
  `);
};
