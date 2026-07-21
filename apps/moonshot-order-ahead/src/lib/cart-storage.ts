import type { OrderLineModifierSelectionInput } from '@moonshot/types';
import type { PickupDelayMinutes } from './pickup-delay-options.js';

export type StoredCartLine = {
  key: string;
  menuItemId: string;
  sizeId: string | null;
  quantity: number;
  modifiers: OrderLineModifierSelectionInput[];
  allergens: string[];
};

export type StoredCart = {
  lines: StoredCartLine[];
  pickupDelayMinutes: number;
};

function storageKey(cafeSlug: string): string {
  return `moonshot_cart:${cafeSlug}`;
}

function isModifier(value: unknown): value is OrderLineModifierSelectionInput {
  if (!value || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  return typeof m.groupId === 'string' && typeof m.optionId === 'string';
}

function isStoredLine(value: unknown): value is StoredCartLine {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  if (typeof row.key !== 'string' || typeof row.menuItemId !== 'string') return false;
  if (row.sizeId !== null && typeof row.sizeId !== 'string') return false;
  if (typeof row.quantity !== 'number' || !Number.isInteger(row.quantity) || row.quantity < 1) {
    return false;
  }
  if (!Array.isArray(row.modifiers) || !row.modifiers.every(isModifier)) return false;
  if (!Array.isArray(row.allergens) || !row.allergens.every((a) => typeof a === 'string')) {
    return false;
  }
  return true;
}

/** Parse sessionStorage JSON; corrupt or empty → empty cart. */
export function parseStoredCart(raw: string | null): StoredCart {
  if (!raw) return { lines: [], pickupDelayMinutes: 0 };
  try {
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== 'object') return { lines: [], pickupDelayMinutes: 0 };
    const obj = data as Record<string, unknown>;
    const lines = Array.isArray(obj.lines) ? obj.lines.filter(isStoredLine) : [];
    const delay =
      typeof obj.pickupDelayMinutes === 'number' &&
      Number.isInteger(obj.pickupDelayMinutes) &&
      obj.pickupDelayMinutes >= 0
        ? obj.pickupDelayMinutes
        : 0;
    return { lines, pickupDelayMinutes: delay };
  } catch {
    return { lines: [], pickupDelayMinutes: 0 };
  }
}

export function readCartFromStorage(cafeSlug: string): StoredCart {
  if (typeof sessionStorage === 'undefined') return { lines: [], pickupDelayMinutes: 0 };
  try {
    return parseStoredCart(sessionStorage.getItem(storageKey(cafeSlug)));
  } catch {
    return { lines: [], pickupDelayMinutes: 0 };
  }
}

export function writeCartToStorage(
  cafeSlug: string,
  cart: { lines: StoredCartLine[]; pickupDelayMinutes: number },
): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (cart.lines.length === 0 && cart.pickupDelayMinutes === 0) {
      sessionStorage.removeItem(storageKey(cafeSlug));
      return;
    }
    const payload: StoredCart = {
      lines: cart.lines,
      pickupDelayMinutes: cart.pickupDelayMinutes,
    };
    sessionStorage.setItem(storageKey(cafeSlug), JSON.stringify(payload));
  } catch {
    /* quota / private mode — ignore */
  }
}

export function clearCartStorage(cafeSlug: string): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.removeItem(storageKey(cafeSlug));
  } catch {
    /* ignore */
  }
}

/** Coerce a stored delay into a chip-compatible value (0 if unknown). */
export function asPickupDelayMinutes(value: number): PickupDelayMinutes {
  return (value >= 0 ? value : 0) as PickupDelayMinutes;
}
