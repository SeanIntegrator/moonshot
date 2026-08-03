import { UK_FSA_ALLERGEN_SET } from '@moonshot/domain';

/**
 * Normalises and validates declared allergen codes per line item.
 * Returns sorted deduped list or an error message.
 */
export function parseDeclaredAllergens(raw: unknown): { ok: true; allergens: string[] } | { ok: false; error: string } {
  if (raw === undefined || raw === null) {
    return { ok: true, allergens: [] };
  }
  if (!Array.isArray(raw)) {
    return { ok: false, error: 'allergens must be an array of codes when provided' };
  }
  const codes: string[] = [];
  for (const x of raw) {
    if (typeof x !== 'string') {
      return { ok: false, error: 'Each allergen must be a string code' };
    }
    const trimmed = x.trim();
    if (!UK_FSA_ALLERGEN_SET.has(trimmed)) {
      return { ok: false, error: `Unknown allergen code: ${trimmed}` };
    }
    codes.push(trimmed);
  }
  const unique = [...new Set(codes)].sort((a, b) => a.localeCompare(b));
  return { ok: true, allergens: unique };
}
