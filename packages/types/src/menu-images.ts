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

export function cafeMenuItemImageKey(cafeId: string, itemId: string): string {
  return `cafes/${cafeId}/menu-items/${itemId}/thumbnail.webp`;
}

/** Build a public CDN URL from bucket base + object key. */
export function publicMenuImageUrl(publicBaseUrl: string, objectKey: string): string {
  const base = publicBaseUrl.replace(/\/$/, '');
  const key = objectKey.replace(/^\//, '');
  return `${base}/${key}`;
}

export function menuTemplateDrinkImageUrl(
  drinkKey: MenuTemplateDrinkKey,
  publicBaseUrl: string,
): string {
  return publicMenuImageUrl(publicBaseUrl, menuTemplateDrinkImageKey(drinkKey));
}
