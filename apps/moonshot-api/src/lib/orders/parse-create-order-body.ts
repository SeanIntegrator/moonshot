import type { CreateOrderLineInput, OrderType } from '@moonshot/types';
import { parseDeclaredAllergens } from '../declared-allergens.js';
import { ORDER_TYPES } from './order-constants.js';

export type ParsedCreateOrderBody = {
  customerName: string;
  notes: string | null | undefined;
  orderType: OrderType;
  items: CreateOrderLineInput[];
  redeemRewardId: string | null;
  /** Omitted / null when client did not send a delay (ASAP). */
  pickupDelayMinutes: number | null;
};

/** Parse `POST /orders` JSON; returns validation issues without throwing (Express-friendly). */
export function parseCreateOrderBody(body: Record<string, unknown>):
  | { ok: true; value: ParsedCreateOrderBody }
  | { ok: false; error: string } {
  const customerName = typeof body.customerName === 'string' ? body.customerName : '';
  const notes =
    typeof body.notes === 'string' ? body.notes : body.notes === null ? null : undefined;
  const orderType = body.orderType as OrderType;
  const redeemRewardId =
    typeof body.redeemRewardId === 'string' && body.redeemRewardId.trim()
      ? body.redeemRewardId.trim()
      : null;

  let pickupDelayMinutes: number | null = null;
  if (body.pickupDelayMinutes !== undefined && body.pickupDelayMinutes !== null) {
    if (typeof body.pickupDelayMinutes !== 'number' || !Number.isInteger(body.pickupDelayMinutes)) {
      return { ok: false, error: 'pickupDelayMinutes must be an integer' };
    }
    if (body.pickupDelayMinutes < 0) {
      return { ok: false, error: 'pickupDelayMinutes must be non-negative' };
    }
    pickupDelayMinutes = body.pickupDelayMinutes;
  }

  if (!ORDER_TYPES.includes(orderType)) {
    return { ok: false, error: 'orderType must be takeaway or eat_in' };
  }

  const rawItems = body.items;
  if (!Array.isArray(rawItems)) {
    return { ok: false, error: 'items must be an array' };
  }

  const items: CreateOrderLineInput[] = [];

  for (const raw of rawItems) {
    const row = raw as Record<string, unknown>;
    const modRaw = row.modifiers;
    let modifiers: CreateOrderLineInput['modifiers'];
    if (Array.isArray(modRaw)) {
      modifiers = modRaw
        .map((m) => {
          const x = (m ?? {}) as Record<string, unknown>;
          return {
            groupId: typeof x.groupId === 'string' ? x.groupId : '',
            optionId: typeof x.optionId === 'string' ? x.optionId : '',
          };
        })
        .filter((m) => m.groupId.length > 0 && m.optionId.length > 0);
      if (modifiers.length === 0) modifiers = undefined;
    }

    const allergensParsed = parseDeclaredAllergens(row.allergens);
    if (!allergensParsed.ok) {
      return { ok: false, error: allergensParsed.error };
    }

    const sizeRaw = row.sizeId;
    const sizeId =
      typeof sizeRaw === 'string' && sizeRaw.trim()
        ? sizeRaw.trim()
        : sizeRaw === null
          ? null
          : undefined;

    items.push({
      menuItemId: typeof row.menuItemId === 'string' ? row.menuItemId : '',
      quantity: typeof row.quantity === 'number' ? row.quantity : NaN,
      sizeId,
      modifiers,
      notes:
        typeof row.notes === 'string'
          ? row.notes
          : row.notes === null
            ? null
            : undefined,
      allergens: allergensParsed.allergens.length > 0 ? allergensParsed.allergens : undefined,
    });
  }

  return {
    ok: true,
    value: { customerName, notes, orderType, items, redeemRewardId, pickupDelayMinutes },
  };
}
