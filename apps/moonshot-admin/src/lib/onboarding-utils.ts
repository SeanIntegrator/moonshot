/** Client-side slug helpers — shared rules from `@moonshot/domain`. */

import { deriveCafeSlugFromName, slugifyCafeName, validateCafeSlugMessage } from '@moonshot/domain';

export { deriveCafeSlugFromName, slugifyCafeName };

export function validateSlugClient(slug: string): string | null {
  return validateCafeSlugMessage(slug);
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
