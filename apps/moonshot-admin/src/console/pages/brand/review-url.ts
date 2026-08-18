/** Client-side check before PATCHing review nudge. Server still validates. */
export function reviewUrlError(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return 'Enter a Google, TripAdvisor, or https link.';
  try {
    const url = trimmed.includes('://') ? new URL(trimmed) : new URL(`https://${trimmed}`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return 'Enter a Google, TripAdvisor, or https link.';
    }
    if (!url.hostname.includes('.')) {
      return 'Enter a Google, TripAdvisor, or https link.';
    }
    return null;
  } catch {
    return 'Enter a Google, TripAdvisor, or https link.';
  }
}

export function isReviewUrlValid(raw: string): boolean {
  return raw.trim().length > 0 && reviewUrlError(raw) === null;
}

/** Persist an https URL even if the owner omitted the scheme. */
export function normaliseReviewUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.includes('://')) return trimmed;
  return `https://${trimmed}`;
}
