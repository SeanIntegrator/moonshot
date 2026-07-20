/**
 * Upload canonical starter drink thumbnails to Railway Object Storage.
 *
 * Usage (from apps/moonshot-api):
 *   pnpm sync:menu-template-images
 *
 * Requires MENU_IMAGE_* env vars. Reads optional sources from
 * assets/menu-template/drinks/{drink-key}.{webp|jpg|jpeg|png}; generates a
 * coloured placeholder when missing.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MENU_IMAGE_THUMBNAIL_HEIGHT,
  MENU_IMAGE_THUMBNAIL_WIDTH,
  MENU_IMAGE_WEBP_QUALITY,
  MENU_TEMPLATE_CATEGORIES,
  menuTemplateDrinkImageKey,
  type MenuTemplateDrinkKey,
} from '@moonshot/types';
import sharp from 'sharp';
import {
  isMenuImageStorageConfigured,
  uploadRawWebpObject,
} from '../src/lib/menu-image-storage.js';
import {
  loadMenuTemplateDrinkSourceWebp,
  resolveMenuTemplateDrinkSourcePath,
} from '../src/lib/menu-template-image-sources.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, '..', 'assets', 'menu-template', 'drinks');

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

async function ensureTemplateDrinkWebp(
  drinkKey: MenuTemplateDrinkKey,
  label: string,
  subcategory?: string,
): Promise<{ webp: Buffer; source: string }> {
  const resolved = await resolveMenuTemplateDrinkSourcePath(ASSETS_DIR, drinkKey);
  if (resolved.kind === 'file') {
    const webp = await loadMenuTemplateDrinkSourceWebp(resolved.path);
    return { webp, source: path.basename(resolved.path) };
  }

  const color = placeholderColor(subcategory);
  const w = MENU_IMAGE_THUMBNAIL_WIDTH;
  const h = MENU_IMAGE_THUMBNAIL_HEIGHT;
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${w}" height="${h}" fill="${color}"/>
      <text x="${w / 2}" y="${Math.round(h / 2) + 5}" text-anchor="middle" font-family="system-ui,sans-serif" font-size="22" fill="#ffffff" opacity="0.92">${label}</text>
    </svg>`;
  const webp = await sharp(Buffer.from(svg)).webp({ quality: MENU_IMAGE_WEBP_QUALITY }).toBuffer();
  await mkdir(ASSETS_DIR, { recursive: true });
  const placeholderPath = path.join(ASSETS_DIR, `${drinkKey}.webp`);
  await writeFile(placeholderPath, webp);
  return { webp, source: 'placeholder' };
}

async function main(): Promise<void> {
  if (!isMenuImageStorageConfigured()) {
    console.error('MENU_IMAGE_* environment variables are not fully configured.');
    process.exit(1);
  }

  const drinkDefs = MENU_TEMPLATE_CATEGORIES.flatMap((cat) => cat.drinks ?? []);

  for (const def of drinkDefs) {
    const { webp, source } = await ensureTemplateDrinkWebp(def.key, def.name, def.subcategory);
    const objectKey = menuTemplateDrinkImageKey(def.key);
    const url = await uploadRawWebpObject({ objectKey, body: webp });
    console.log(`Uploaded ${def.key} (${source}) -> ${url}`);
  }

  console.log(`Done. ${drinkDefs.length} template drink images synced.`);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
