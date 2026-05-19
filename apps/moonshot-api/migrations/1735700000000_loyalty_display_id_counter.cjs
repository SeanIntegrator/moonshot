/**
 * node-pg-migrate entry — runs SQL from 010_loyalty_display_id_counter.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(path.join(__dirname, 'sql', '010_loyalty_display_id_counter.sql'), 'utf8');
  pgm.sql(sql);
};

exports.down = (pgm) => {
  /* Restore the deterministic md5-based trigger from 007. */
  pgm.sql(`
    CREATE OR REPLACE FUNCTION cafe_users_assign_loyalty_display_id()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
      IF NEW.loyalty_display_id IS NULL THEN
        NEW.loyalty_display_id := substr(md5(NEW.cafe_id::text || NEW.user_id::text), 1, 8);
      END IF;
      RETURN NEW;
    END;
    $$;
  `);
  pgm.sql(`ALTER TABLE cafes DROP COLUMN IF EXISTS loyalty_display_counter;`);
};
