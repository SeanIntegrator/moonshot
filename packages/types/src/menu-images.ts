import type { MenuTemplateDrinkKey } from './menu-template.js';

/** Object key prefix for canonical starter drink thumbnails in Railway storage. */
export const MENU_TEMPLATE_IMAGE_PREFIX = 'template/drinks';

export const MENU_IMAGE_THUMBNAIL_WIDTH = 360;
export const MENU_IMAGE_THUMBNAIL_HEIGHT = 240;
export const MENU_IMAGE_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export const MENU_IMAGE_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export type MenuImageMimeType = (typeof MENU_IMAGE_ALLOWED_MIME_TYPES)[number];

export function menuTemplateDrinkImageKey(drinkKey: MenuTemplateDrinkKey): string {
  return `${MENU_TEMPLATE_IMAGE_PREFIX}/${drinkKey}.webp`;
}

/** Short cache-busting segment for café uploads (base36 timestamp). */
export function newMenuItemImageVersion(): string {
  return Date.now().toString(36);
}

/**
 * Per-café upload object key. `version` must be unique per replace so browsers
 * with long-lived immutable caches fetch the new bytes immediately.
 */
export function cafeMenuItemImageKey(cafeId: string, itemId: string, version: string): string {
  return `cafes/${cafeId}/menu-items/${itemId}/${version}.webp`;
}

/** Build a public CDN URL from bucket base + object key. */
export function publicMenuImageUrl(publicBaseUrl: string, objectKey: string): string {
  const base = publicBaseUrl.replace(/\/$/, '');
  const key = objectKey.replace(/^\//, '');
  return `${base}/${key}`;
}

/**
 * Extract the object key suffix from a stored public media URL, or null if the
 * URL does not sit under `publicBaseUrl`.
 */
export function menuImageObjectKeyFromPublicUrl(
  publicUrl: string,
  publicBaseUrl: string,
): string | null {
  const base = publicBaseUrl.replace(/\/$/, '');
  if (!publicUrl.startsWith(`${base}/`)) return null;
  const key = publicUrl.slice(base.length + 1).split('?')[0] ?? '';
  if (!key || key.includes('..')) return null;
  return key;
}

export function menuTemplateDrinkImageUrl(
  drinkKey: MenuTemplateDrinkKey,
  publicBaseUrl: string,
): string {
  return publicMenuImageUrl(publicBaseUrl, menuTemplateDrinkImageKey(drinkKey));
}
