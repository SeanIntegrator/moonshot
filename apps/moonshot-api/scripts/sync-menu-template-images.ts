/**
 * Upload canonical starter drink thumbnails to Railway Object Storage.
 *
 * Usage (from apps/moonshot-api):
 *   pnpm sync:menu-template-images
 *
 * Requires MENU_IMAGE_* env vars. Reads optional source files from
 * assets/menu-template/drinks/{drink-key}.webp; generates a placeholder when missing.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MENU_TEMPLATE_CATEGORIES,
  menuTemplateDrinkImageKey,
  type MenuTemplateDrinkKey,
} from '@moonshot/types';
import sharp from 'sharp';
import {
  isMenuImageStorageConfigured,
  uploadRawWebpObject,
} from '../src/lib/menu-image-storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'menu-template', 'drinks');

const DRINK_KEYS: MenuTemplateDrinkKey[] = MENU_TEMPLATE_CATEGORIES.flatMap((cat) =>
  (cat.drinks ?? []).map((d) => d.key),
);

const PLACEHOLDER_COLORS: Record<string, string> = {
  coffee: '#6f4e37',
  tea: '#8b7355',
  chocolate: '#5c3d2e',
  matcha: '#7a9e6a',
};

function placeholderColor(subcategory?: string): string {
  if (subcategory && PLACEHOLDER_COLORS[subcategory]) {
    return PLACEHOLDER_COLORS[subcategory]!;
  }
  return '#8a8178';
}

async function ensurePlaceholderWebp(drinkKey: MenuTemplateDrinkKey, label: string, subcategory?: string): Promise<Buffer> {
  const assetPath = path.join(ASSETS_DIR, `${drinkKey}.webp`);
  try {
    return await readFile(assetPath);
  } catch {
    const color = placeholderColor(subcategory);
    const svg = `<svg width="360" height="240" xmlns="http://www.w3.org/2000/svg">
      <rect width="360" height="240" fill="${color}"/>
      <text x="180" y="125" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" fill="#ffffff" opacity="0.92">${label}</text>
    </svg>`;
    const webp = await sharp(Buffer.from(svg)).webp({ quality: 82 }).toBuffer();
    await mkdir(ASSETS_DIR, { recursive: true });
    await writeFile(assetPath, webp);
    return webp;
  }
}

async function main(): Promise<void> {
  if (!isMenuImageStorageConfigured()) {
    console.error('MENU_IMAGE_* environment variables are not fully configured.');
    process.exit(1);
  }

  const drinkDefs = MENU_TEMPLATE_CATEGORIES.flatMap((cat) => cat.drinks ?? []);

  for (const def of drinkDefs) {
    const webp = await ensurePlaceholderWebp(def.key, def.name, def.subcategory);
    const objectKey = menuTemplateDrinkImageKey(def.key);
    const url = await uploadRawWebpObject({ objectKey, body: webp });
    console.log(`Uploaded ${def.key} -> ${url}`);
  }

  console.log(`Done. ${drinkDefs.length} template drink images synced.`);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
