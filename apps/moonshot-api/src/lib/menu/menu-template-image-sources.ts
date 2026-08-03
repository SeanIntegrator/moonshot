import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import type { MenuTemplateDrinkKey } from '@moonshot/domain';
import {
  buildMenuThumbnailWebp,
  detectMenuImageMime,
} from './menu-image-process.js';

/** Prefer WebP sources, then common camera formats. */
export const MENU_TEMPLATE_SOURCE_EXTENSIONS = ['.webp', '.jpg', '.jpeg', '.png'] as const;

export type MenuTemplateSourceResolution =
  | { kind: 'file'; path: string; extension: (typeof MENU_TEMPLATE_SOURCE_EXTENSIONS)[number] }
  | { kind: 'missing' };

/**
 * Resolve the best local source path for a template drink key under `assetsDir`.
 * Preference order: .webp → .jpg → .jpeg → .png.
 */
export async function resolveMenuTemplateDrinkSourcePath(
  assetsDir: string,
  drinkKey: MenuTemplateDrinkKey,
): Promise<MenuTemplateSourceResolution> {
  for (const extension of MENU_TEMPLATE_SOURCE_EXTENSIONS) {
    const candidate = path.join(assetsDir, `${drinkKey}${extension}`);
    try {
      await access(candidate);
      return { kind: 'file', path: candidate, extension };
    } catch {
      // try next extension
    }
  }
  return { kind: 'missing' };
}

/**
 * Load a local source file and normalise it to the catalogue thumbnail WebP.
 * Template sync and admin uploads share the same resize/encode path.
 */
export async function loadMenuTemplateDrinkSourceWebp(filePath: string): Promise<Buffer> {
  const raw = await readFile(filePath);
  await detectMenuImageMime(raw);
  return buildMenuThumbnailWebp(raw);
}
