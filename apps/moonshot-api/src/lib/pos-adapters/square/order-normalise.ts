import type { NormalisedOrder, NormalisedOrderItem, NormalisedOrderLineModifier, OrderType, PaymentStatus } from '@moonshot/types';
import type { NormalisedWebhookEvent } from '@moonshot/domain';
import { createSquareClient, type SquareClientEnvironment } from './client.js';
import { SQUARE_ORDER_WEBHOOK_TYPES, type SquareWebhookEnvelope } from './webhook.js';

type MoneyLike = { amount?: bigint | number | null; currency?: string | null } | null | undefined;

/** Trim free-text notes; empty / whitespace-only → null so KDS never stores "". */
function nonemptyNote(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function moneyMinor(m: MoneyLike): number {
  if (!m || m.amount == null) return 0;
  return Number(m.amount);
}

function mapOrderType(order: Record<string, unknown>): OrderType {
  const fulfillments = order.fulfillments;
  if (Array.isArray(fulfillments)) {
    for (const f of fulfillments) {
      if (!f || typeof f !== 'object') continue;
      const type = (f as { type?: string }).type?.toUpperCase();
      if (type === 'PICKUP' || type === 'DELIVERY') return 'takeaway';
      if (type === 'DINE_IN') return 'eat_in';
    }
  }
  return 'takeaway';
}

function customerNameFromOrder(order: Record<string, unknown>): string {
  const ticketName = typeof order.ticketName === 'string' ? order.ticketName.trim() : '';
  if (ticketName) return ticketName;

  const fulfillments = order.fulfillments;
  if (Array.isArray(fulfillments)) {
    for (const f of fulfillments) {
      if (!f || typeof f !== 'object') continue;
      const pickup = (f as { pickupDetails?: { recipient?: { displayName?: string } } })
        .pickupDetails;
      const name = pickup?.recipient?.displayName?.trim();
      if (name) return name;
    }
  }

  return 'POS Guest';
}

function paymentStatusFromOrder(order: Record<string, unknown>): PaymentStatus {
  const tenders = order.tenders;
  if (Array.isArray(tenders) && tenders.length > 0) return 'paid';
  const state = typeof order.state === 'string' ? order.state.toUpperCase() : '';
  if (state === 'COMPLETED') return 'paid';
  return 'unpaid';
}

function mapModifiers(raw: unknown): NormalisedOrderLineModifier[] {
  if (!Array.isArray(raw)) return [];
  const out: NormalisedOrderLineModifier[] = [];
  for (const m of raw) {
    if (!m || typeof m !== 'object') continue;
    const mod = m as {
      uid?: string;
      catalogObjectId?: string;
      name?: string;
      basePriceMoney?: MoneyLike;
    };
    const optionName = typeof mod.name === 'string' ? mod.name : 'Modifier';
    out.push({
      groupId: 'pos',
      groupName: 'POS',
      optionId: mod.uid ?? mod.catalogObjectId ?? optionName,
      optionName,
      priceMinor: moneyMinor(mod.basePriceMoney),
      posOptionId: mod.catalogObjectId ?? null,
    });
  }
  return out;
}

function mapLineItems(raw: unknown): NormalisedOrderItem[] {
  if (!Array.isArray(raw)) return [];
  const out: NormalisedOrderItem[] = [];
  for (const line of raw) {
    if (!line || typeof line !== 'object') continue;
    const li = line as {
      uid?: string;
      name?: string;
      quantity?: string | number;
      catalogObjectId?: string;
      basePriceMoney?: MoneyLike;
      modifiers?: unknown;
      note?: string;
      itemType?: string;
    };
    const qty = Math.max(1, Math.floor(Number(li.quantity ?? 1)) || 1);
    out.push({
      id: li.uid ?? `pos-line-${out.length}`,
      menuItemId: null,
      posVariationId: li.catalogObjectId ?? null,
      itemName: typeof li.name === 'string' && li.name.trim() ? li.name.trim() : 'Item',
      quantity: qty,
      unitPriceMinor: moneyMinor(li.basePriceMoney),
      modifiers: mapModifiers(li.modifiers),
      allergens: [],
      notes: nonemptyNote(li.note),
      category: li.itemType === 'GIFT_CARD' ? 'other' : null,
    });
  }
  return out;
}

/** Map a Square Order object into a partial NormalisedOrder snapshot for ingress. */
export function squareOrderToSnapshot(
  cafeId: string,
  order: Record<string, unknown>,
): Partial<NormalisedOrder> {
  const total = order.totalMoney as MoneyLike;
  const currency =
    (total && typeof total.currency === 'string' && total.currency.toUpperCase()) || 'GBP';

  return {
    cafeId,
    source: 'pos',
    posOrderId: typeof order.id === 'string' ? order.id : null,
    customerName: customerNameFromOrder(order),
    notes: nonemptyNote(order.note),
    orderType: mapOrderType(order),
    status: 'confirmed',
    paymentStatus: paymentStatusFromOrder(order),
    totalMinor: moneyMinor(total),
    currency,
    items: mapLineItems(order.lineItems),
  };
}

export async function fetchSquareOrder(params: {
  accessToken: string;
  orderId: string;
  environment?: SquareClientEnvironment;
}): Promise<Record<string, unknown> | null> {
  const client = createSquareClient({
    accessToken: params.accessToken,
    environment: params.environment,
  });
  const res = await client.orders.get({ orderId: params.orderId });
  const order = res.order as Record<string, unknown> | undefined;
  return order ?? null;
}

/**
 * Turn a verified Square envelope + optional retrieved order into a NormalisedWebhookEvent.
 */
export function mapSquareEnvelopeToWebhookEvent(params: {
  cafeId: string;
  envelope: SquareWebhookEnvelope;
  order: Record<string, unknown> | null;
}): NormalisedWebhookEvent {
  const { cafeId, envelope, order } = params;

  if (!SQUARE_ORDER_WEBHOOK_TYPES.has(envelope.type)) {
    return { kind: 'ignored', cafeId, reason: `unhandled_type:${envelope.type}` };
  }

  const posOrderId =
    (order && typeof order.id === 'string' ? order.id : null) ?? envelope.orderId;
  if (!posOrderId) {
    return { kind: 'ignored', cafeId, reason: 'missing_order_id' };
  }

  const state =
    order && typeof order.state === 'string' ? order.state.toUpperCase() : null;

  if (state === 'CANCELED' || state === 'CANCELLED') {
    return { kind: 'order_removed', cafeId, posOrderId };
  }

  if (state === 'DRAFT') {
    return { kind: 'ignored', cafeId, reason: 'draft_order' };
  }

  const snapshot = order
    ? squareOrderToSnapshot(cafeId, order)
    : (() => {
        // Fetch failed or omitted — stub ticket keeps KDS moving; ops must see the empty board.
        console.warn('[square-order] square_order_fetch_missing', {
          cafeId,
          posOrderId,
          envelopeType: envelope.type,
        });
        return {
          cafeId,
          source: 'pos' as const,
          posOrderId,
          customerName: 'POS Guest',
          status: 'confirmed' as const,
          paymentStatus: 'unpaid' as const,
          totalMinor: 0,
          currency: 'GBP',
          items: [],
          orderType: 'takeaway' as const,
          notes: null,
        };
      })();

  return {
    kind: 'order_open_or_updated',
    cafeId,
    posOrderId,
    snapshot,
  };
}
