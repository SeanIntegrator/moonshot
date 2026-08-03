/**
 * Writes dist/runtime-config.js at container start so VITE_API_URL can change
 * without rebuilding the Vite bundle (Railway shared variables apply at runtime).
 *
 * Usage from an app root:
 *   node ../../packages/web-runtime/scripts/write-runtime-config.mjs
 * or:
 *   node --import ... (via package export)
 *
 * Resolves the app root as cwd (the app's package directory when run from npm scripts).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const apiUrl = (process.env.VITE_API_URL ?? '').trim();
const distDir = join(root, 'dist');
mkdirSync(distDir, { recursive: true });
const out = join(distDir, 'runtime-config.js');
writeFileSync(out, `window.__MOONSHOT_RUNTIME__=${JSON.stringify({ apiUrl })};\n`);
console.log(
  `[runtime-config] ${out} apiUrl=${apiUrl || '(empty — falls back to build-time VITE_API_URL)'}`,
);
