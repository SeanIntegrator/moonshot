/** GBP minor units → display string with tabular nums */
export function formatMoney(minor: number, currency = 'GBP'): string {
  const symbol = currency === 'GBP' ? '£' : `${currency} `;
  return `${symbol}${(minor / 100).toFixed(2)}`;
}

/** Customer-facing price tag — empty string when free (never show £0.00). */
export function formatPriceTag(minor: number, currency = 'GBP'): string {
  if (minor <= 0) return '';
  // Sub-pound modifiers/tags read more naturally as pence (50p, not £0.50).
  if (currency === 'GBP' && minor < 100) {
    return `${minor}p`;
  }
  return formatMoney(minor, currency);
}

/** Optional + prefix for modifier deltas */
export function formatModifierDelta(minor: number, currency = 'GBP'): string {
  const tag = formatPriceTag(minor, currency);
  return tag ? `+${tag}` : '';
}

export function formatFromPrice(minor: number, currency = 'GBP'): string {
  const tag = formatPriceTag(minor, currency);
  return tag ? `from ${tag}` : '';
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  // Force 24h so pickup chips don't pick up locale am/PM quirks.
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString([], { month: 'short', year: 'numeric' });
}

/** Day + month + year for order titles (“Ordered on 12 Mar 2026”). */
export function formatOrderDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function firstName(displayName: string | null | undefined, email?: string): string {
  if (displayName?.trim()) return displayName.trim().split(/\s+/)[0]!;
  if (email) return email.split('@')[0]!;
  return 'there';
}

/**
 * Customer-facing modifier line for cards / receipts.
 * Pass already-filtered modifiers when defaults should stay hidden
 * (see `isStandardModifierVariant`).
 */
export function modifierSummary(modifiers: { optionName: string }[]): string {
  if (modifiers.length === 0) return '';
  // Keep Title Case for display even if a snapshot was stored lowercase.
  return modifiers.map((m) => titleCaseWords(m.optionName)).join(' · ');
}

/** "Flat white" / "whole" → "Flat White" / "Whole" */
export function titleCaseWords(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
}

/** Whole minutes until an ISO timestamp (never negative). */
export function minutesUntil(iso: string | null | undefined, nowMs = Date.now()): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - nowMs;
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.ceil(ms / 60_000));
}

export function formatMinutesLabel(minutes: number): string {
  return minutes === 1 ? '1 min' : `${minutes} mins`;
}
