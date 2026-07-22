/** Humanise UK FSA allergen codes for KDS warnings. */
export function formatAllergenLabel(code: string): string {
  return code
    .split('_')
    .map((part) => (part.length ? part[0]!.toUpperCase() + part.slice(1) : part))
    .join(' ');
}
