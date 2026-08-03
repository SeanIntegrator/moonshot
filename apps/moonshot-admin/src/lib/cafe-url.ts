import { deriveCafeSlugFromName } from '@moonshot/domain';
import { checkSlugAvailable } from './admin-api.js';

export type SlugCheck = (slug: string) => Promise<{ available: boolean; slug: string }>;

/**
 * Probe the derived slug, then -2, -3… so the signup URL preview stays honest
 * when a café name is already taken. Never blocks signup — the server re-allocates.
 */
export async function resolveAvailableSlug(
  name: string,
  check: SlugCheck = checkSlugAvailable,
): Promise<string> {
  const base = deriveCafeSlugFromName(name);
  const candidates: string[] = [base];
  for (let n = 2; n <= 20; n++) {
    const suffix = `-${n}`;
    candidates.push(`${base.slice(0, Math.max(1, 40 - suffix.length))}${suffix}`);
  }

  for (const candidate of candidates) {
    try {
      const result = await check(candidate);
      if (result.available) return result.slug || candidate;
    } catch {
      // Network blip — fall through; preview may be slightly optimistic.
      return candidate;
    }
  }
  return base;
}

export function orderAheadHostPath(baseUrl: string, slug: string): string {
  const host = baseUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return `${host}/${slug}`;
}
