/**
 * Café slug rules — shared by API validation and admin onboarding UI.
 * Keep client + server in lockstep: drift here causes signup/API disagreement.
 */

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

/**
 * Derive a valid café slug from a display name.
 * Pads short results and falls back to `cafe` when slugify yields nothing
 * (e.g. non-latin names), so signup never needs a manual slug field.
 */
export function deriveCafeSlugFromName(name: string): string {
  let slug = slugifyCafeName(name);
  if (!slug) slug = 'cafe';
  // Pad under the 3-char minimum without inventing letters — repeat last char.
  while (slug.length < 3) {
    slug = `${slug}${slug[slug.length - 1] ?? 'x'}`;
  }
  return slug.slice(0, 40);
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

/** Client-friendly message, or null when valid. */
export function validateCafeSlugMessage(raw: string): string | null {
  const result = validateCafeSlug(raw);
  if (result.ok) return null;
  // Soften API wording for form UI
  if (result.error.includes('at least 3')) return 'At least 3 characters';
  if (result.error.includes('at most 40')) return 'At most 40 characters';
  if (result.error.includes('lowercase')) return 'Lowercase letters, numbers, and hyphens only';
  if (result.error.includes('reserved')) return 'This URL is reserved';
  return result.error;
}
