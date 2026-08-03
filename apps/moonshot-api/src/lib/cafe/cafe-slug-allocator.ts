import { randomBytes } from 'node:crypto';
import { deriveCafeSlugFromName, validateCafeSlug } from '../cafe-slug.js';
import { findCafeBySlug } from '../cafes-repository.js';

const MAX_NUMERIC_SUFFIX = 99;

export class CafeSlugAllocationError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: 'VALIDATION' | 'INTERNAL',
  ) {
    super(message);
    this.name = 'CafeSlugAllocationError';
  }
}

/**
 * Resolve the first free slug for a café name (or an explicit candidate).
 * Tries base, base-2 … base-99, then a random suffix for extreme collisions.
 */
export async function allocateCafeSlug(
  cafeName: string,
  explicitSlug?: string,
): Promise<string> {
  const base = explicitSlug?.trim()
    ? (() => {
        const result = validateCafeSlug(explicitSlug);
        if (!result.ok) {
          throw new CafeSlugAllocationError(result.error, 400, 'VALIDATION');
        }
        return result.slug;
      })()
    : deriveCafeSlugFromName(cafeName);

  const candidates: string[] = [base];
  for (let n = 2; n <= MAX_NUMERIC_SUFFIX; n++) {
    const suffix = `-${n}`;
    candidates.push(`${base.slice(0, Math.max(1, 40 - suffix.length))}${suffix}`);
  }

  for (const candidate of candidates) {
    const validated = validateCafeSlug(candidate);
    if (!validated.ok) continue;
    const existing = await findCafeBySlug(validated.slug);
    if (!existing) return validated.slug;
  }

  // Extremely unlikely — random hex suffix keeps us under 40 chars.
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = `-${randomBytes(2).toString('hex')}`;
    const candidate = `${base.slice(0, Math.max(1, 40 - suffix.length))}${suffix}`;
    const validated = validateCafeSlug(candidate);
    if (!validated.ok) continue;
    const existing = await findCafeBySlug(validated.slug);
    if (!existing) return validated.slug;
  }

  throw new CafeSlugAllocationError('Could not allocate a café URL', 500, 'INTERNAL');
}
