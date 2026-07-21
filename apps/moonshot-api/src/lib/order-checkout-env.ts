import type { CreateOrderLineInput, OrderAheadFeatureConfig, OrderType } from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import { ApiHttpError } from './http-errors.js';
import { parseDeclaredAllergens } from './declared-allergens.js';

const ORDER_TYPES: OrderType[] = ['takeaway', 'eat_in'];

export type ParsedCreateOrderBody = {
  customerName: string;
  notes: string | null | undefined;
  orderType: OrderType;
  items: CreateOrderLineInput[];
  redeemRewardId: string | null;
  /** Omitted / null when client did not send a delay (ASAP). */
  pickupDelayMinutes: number | null;
};

export function parseOrderAheadPaymentMode(
  orderAhead: OrderAheadFeatureConfig | null | undefined,
): 'stripe' | 'pay_in_store' {
  if (!orderAhead?.enabled) {
    throw new ApiHttpError(
      403,
      ApiErrorCode.FORBIDDEN,
      'Order ahead is disabled for this café',
    );
  }
  const p = orderAhead.paymentProvider;
  if (p === 'pay_in_store') return 'pay_in_store';
  if (p === 'square_payment_links') {
    throw new ApiHttpError(
      501,
      ApiErrorCode.VALIDATION,
      'square_payment_links checkout is not implemented yet',
    );
  }
  return 'stripe';
}

function normalizeBaseUrl(raw: string): string {
  return raw.replace(/\/+$/, '');
}

/**
 * Stripe return URLs for a café — built from platform `ORDER_AHEAD_BASE_URL` + slug.
 * Café owners never configure these; ops sets one base URL on the API service.
 */
export function checkoutUrlsForCafe(cafeSlug: string): { successUrl: string; cancelUrl: string } {
  const slug = cafeSlug.trim();
  if (!slug) {
    throw new ApiHttpError(500, ApiErrorCode.CONFIG, 'Café slug is required for Stripe checkout URLs');
  }

  const base = process.env.ORDER_AHEAD_BASE_URL?.trim();
  if (base) {
    const origin = normalizeBaseUrl(base);
    return {
      successUrl: `${origin}/${encodeURIComponent(slug)}/checkout/restore?checkout_session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/${encodeURIComponent(slug)}/checkout`,
    };
  }

  return checkoutUrlsFromEnvLegacy();
}

/** @deprecated Prefer `ORDER_AHEAD_BASE_URL` — single static success/cancel pair for all cafés */
export function checkoutUrlsFromEnv(): { successUrl: string; cancelUrl: string } {
  return checkoutUrlsFromEnvLegacy();
}

/** Single-café fallback when ORDER_AHEAD_BASE_URL is unset — requires manual slug in URL. */
function checkoutUrlsFromEnvLegacy(): { successUrl: string; cancelUrl: string } {
  const success = process.env.ORDER_AHEAD_SUCCESS_URL?.trim();
  const cancel = process.env.ORDER_AHEAD_CANCEL_URL?.trim();
  if (!success || !cancel) {
    throw new ApiHttpError(
      500,
      ApiErrorCode.CONFIG,
      'Set ORDER_AHEAD_BASE_URL on the API (recommended), or ORDER_AHEAD_SUCCESS_URL and ORDER_AHEAD_CANCEL_URL for Stripe checkout',
    );
  }
  const successUrl = success.includes('{CHECKOUT_SESSION_ID}')
    ? success
    : `${normalizeBaseUrl(success)}?checkout_session_id={CHECKOUT_SESSION_ID}`;
  return { successUrl, cancelUrl: cancel };
}

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
