/**
 * Writes dist/runtime-config.js at container start so VITE_API_URL can change
 * without rebuilding the Vite bundle (Railway shared variables apply at runtime).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const apiUrl = (process.env.VITE_API_URL ?? '').trim();
const distDir = join(root, 'dist');
mkdirSync(distDir, { recursive: true });
const out = join(distDir, 'runtime-config.js');
writeFileSync(out, `window.__MOONSHOT_RUNTIME__=${JSON.stringify({ apiUrl })};\n`);
console.log(`[runtime-config] ${out} apiUrl=${apiUrl || '(empty — falls back to build-time VITE_API_URL)'}`);
