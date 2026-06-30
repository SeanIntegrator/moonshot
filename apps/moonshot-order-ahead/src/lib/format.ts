/** GBP minor units → display string with tabular nums */
export function formatMoney(minor: number, currency = 'GBP'): string {
  const symbol = currency === 'GBP' ? '£' : `${currency} `;
  return `${symbol}${(minor / 100).toFixed(2)}`;
}

/** Customer-facing price tag — empty string when free (never show £0.00). */
export function formatPriceTag(minor: number, currency = 'GBP'): string {
  if (minor <= 0) return '';
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
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString([], { month: 'short', year: 'numeric' });
}

/** "Good morning" / "Good afternoon" / "Good evening" */
export function timeGreeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(displayName: string | null | undefined, email?: string): string {
  if (displayName?.trim()) return displayName.trim().split(/\s+/)[0]!;
  if (email) return email.split('@')[0]!;
  return 'there';
}

export function categoryLabel(category: string): string {
  return category.replace(/_/g, ' ');
}

export function modifierSummary(modifiers: { optionName: string }[]): string {
  if (modifiers.length === 0) return '';
  return modifiers.map((m) => m.optionName.toLowerCase()).join(' · ');
}
