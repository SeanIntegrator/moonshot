/** Client-side slug helpers — mirror server rules in cafe-slug.ts */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED = new Set(['admin', 'api', 'kds', 'signup', 'login', 'www', 'order', 'app', 'health']);

export function slugifyCafeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export function validateSlugClient(slug: string): string | null {
  const s = slug.trim().toLowerCase();
  if (s.length < 3) return 'At least 3 characters';
  if (s.length > 40) return 'At most 40 characters';
  if (!SLUG_RE.test(s)) return 'Lowercase letters, numbers, and hyphens only';
  if (RESERVED.has(s)) return 'This URL is reserved';
  return null;
}

export function getPasswordStrength(password: string): 'weak' | 'fair' | 'strong' {
  if (password.length < 8) return 'weak';
  let score = 0;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score >= 3) return 'strong';
  if (score >= 1) return 'fair';
  return 'weak';
}

export function getOrderAheadBaseUrl(): string {
  const raw = import.meta.env.VITE_ORDER_AHEAD_BASE_URL?.trim();
  return raw ? raw.replace(/\/+$/, '') : 'https://order.moonshot.app';
}

export function getKdsBaseUrl(): string {
  const raw = import.meta.env.VITE_KDS_BASE_URL?.trim();
  return raw ? raw.replace(/\/+$/, '') : 'https://kds.moonshot.app';
}

export function getMarketingUrl(): string {
  const raw = import.meta.env.VITE_MARKETING_URL?.trim();
  return raw ? raw.replace(/\/+$/, '') : '/';
}
