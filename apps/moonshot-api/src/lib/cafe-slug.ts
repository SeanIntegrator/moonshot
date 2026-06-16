const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const RESERVED_CAFE_SLUGS = new Set([
  'admin',
  'api',
  'kds',
  'signup',
  'login',
  'www',
  'order',
  'app',
  'health',
]);

export function normalizeCafeSlugInput(raw: string): string {
  return raw.trim().toLowerCase();
}

export function slugifyCafeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export type SlugValidationResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

export function validateCafeSlug(raw: string): SlugValidationResult {
  const slug = normalizeCafeSlugInput(raw);
  if (slug.length < 3) {
    return { ok: false, error: 'Slug must be at least 3 characters' };
  }
  if (slug.length > 40) {
    return { ok: false, error: 'Slug must be at most 40 characters' };
  }
  if (!SLUG_RE.test(slug)) {
    return { ok: false, error: 'Slug must use lowercase letters, numbers, and hyphens only' };
  }
  if (RESERVED_CAFE_SLUGS.has(slug)) {
    return { ok: false, error: 'This slug is reserved' };
  }
  return { ok: true, slug };
}
