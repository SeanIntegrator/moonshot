/**
 * Allow only known menu-image object layouts so the public media proxy cannot
 * be used as a generic S3 read-through.
 */
const TEMPLATE_DRINK_KEY_RE =
  /^template\/drinks\/[a-z0-9]+(?:-[a-z0-9]+)*\.webp$/;
/** Legacy `thumbnail.webp` plus versioned `{base36}.webp` café uploads. */
const CAFE_ITEM_THUMBNAIL_KEY_RE =
  /^cafes\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/menu-items\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[a-z0-9]+\.webp$/i;

/** Normalise and validate a request path into an allowed S3 object key, or null. */
export function parseAllowedMenuImageObjectKey(raw: string): string | null {
  let key: string;
  try {
    key = decodeURIComponent(raw);
  } catch {
    return null;
  }

  key = key.replace(/^\/+/, '').replace(/\/{2,}/g, '/');
  if (!key || key.includes('..') || key.includes('\\') || key.includes('\0')) {
    return null;
  }

  if (TEMPLATE_DRINK_KEY_RE.test(key) || CAFE_ITEM_THUMBNAIL_KEY_RE.test(key)) {
    return key;
  }
  return null;
}
