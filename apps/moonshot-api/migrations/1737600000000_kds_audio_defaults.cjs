/**
 * node-pg-migrate entry — runs SQL from 029_kds_audio_defaults.sql
 * @param {import('node-pg-migrate').MigrationBuilder} pgm
 */
exports.shorthands = undefined;

const fs = require('node:fs');
const path = require('node:path');

exports.up = (pgm) => {
  const sql = fs.readFileSync(
    path.join(__dirname, 'sql', '029_kds_audio_defaults.sql'),
    'utf8',
  );
  pgm.sql(sql);
};

exports.down = (pgm) => {
  pgm.sql(`
    UPDATE cafes
    SET kds_config = (kds_config #- '{audio,enabled}')
      #- '{audio,overdueSound}'
      #- '{audio,overdueRepeatSeconds}';
  `);
};
