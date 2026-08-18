import type { AdminStockOptionRow, StockAvailability } from '@moonshot/types';

export function usedOnLabel(count: number): string {
  if (count === 1) return 'on 1 drink';
  return `on ${count} drinks`;
}

export function optionStockMeta(
  availability: StockAvailability,
  usedOnCount: number,
): string {
  const on = usedOnLabel(usedOnCount);
  if (availability === 'out_today') return `Back when you open tomorrow · ${on}`;
  if (availability === 'out') return `Until you turn it back on · ${on}`;
  return on;
}

export function foodStockMeta(availability: 'in' | 'out'): string {
  return availability === 'out' ? 'Off the menu' : 'On the menu';
}

/** First two letters of the name — kitchen-style initials when chipLabel is absent. */
export function stockInitials(name: string): string {
  const letters = name.replace(/[^a-zA-Z0-9]+/g, '');
  if (letters.length >= 2) return letters.slice(0, 2);
  if (letters.length === 1) return letters;
  return '?';
}

export type StockOptionGroup = {
  groupId: string;
  groupName: string;
  usedOnCount: number;
  options: AdminStockOptionRow[];
};

export function groupStockOptions(rows: AdminStockOptionRow[]): StockOptionGroup[] {
  const map = new Map<string, StockOptionGroup>();
  for (const row of rows) {
    const existing = map.get(row.groupId);
    if (existing) {
      existing.options.push(row);
      continue;
    }
    map.set(row.groupId, {
      groupId: row.groupId,
      groupName: row.groupName,
      usedOnCount: row.usedOnCount,
      options: [row],
    });
  }
  return [...map.values()];
}
