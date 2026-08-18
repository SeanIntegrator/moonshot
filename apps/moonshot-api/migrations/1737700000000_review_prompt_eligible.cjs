/**
 * node-pg-migrate entry — runs SQL from 030_review_prompt_eligible.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(
    path.join(__dirname, 'sql', '030_review_prompt_eligible.sql'),
    'utf8',
  );
  pgm.sql(sql);
};

exports.down = () => {
  // One-way data repair — do not re-burn eligible rows.
};
