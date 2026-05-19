/**
 * node-pg-migrate entry — runs SQL from 007_loyalty_ledger.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(path.join(__dirname, 'sql', '007_loyalty_ledger.sql'), 'utf8');
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`DROP TRIGGER IF EXISTS trg_cafe_users_loyalty_display_id ON cafe_users;`);
  pgm.sql(`DROP FUNCTION IF EXISTS cafe_users_assign_loyalty_display_id;`);
  pgm.sql(`DROP INDEX IF EXISTS cafe_users_cafe_loyalty_display_unique;`);
  pgm.sql(`ALTER TABLE cafe_users DROP COLUMN IF EXISTS loyalty_display_id;`);
  pgm.sql(`DROP INDEX IF EXISTS loyalty_rewards_user_created;`);
  pgm.sql(`DROP INDEX IF EXISTS loyalty_rewards_user_unredeemed;`);
  pgm.sql(`DROP TABLE IF EXISTS loyalty_rewards;`);
  pgm.sql(`DROP INDEX IF EXISTS loyalty_transactions_user_created;`);
  pgm.sql(`DROP INDEX IF EXISTS loyalty_transactions_stamp_order_unique;`);
  pgm.sql(`DROP TABLE IF EXISTS loyalty_transactions;`);
};
