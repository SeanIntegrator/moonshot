/**
 * Thin wrapper so existing `node scripts/write-runtime-config.mjs` package scripts keep working.
 * Shared implementation: packages/web-runtime/scripts/write-runtime-config.mjs
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const script = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../packages/web-runtime/scripts/write-runtime-config.mjs',
);
const result = spawnSync(process.execPath, [script], { stdio: 'inherit', cwd: process.cwd() });
process.exit(result.status ?? 1);
