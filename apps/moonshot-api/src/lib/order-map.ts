import type {
  EtaMode,
  NormalisedOrder,
  NormalisedOrderItem,
  NormalisedOrderLineModifier,
  OrderCancelReason,
  OrderSource,
  OrderStatus,
  OrderType,
  PaymentStatus,
  PickupWindow,
} from '@moonshot/types';

const CANCEL_REASONS = new Set<OrderCancelReason>(['customer', 'pos', 'auto_expire']);

export type OrderRowDb = {
  id: string;
  cafe_id: string;
  user_id: string | null;
  pos_order_id: string | null;
  customer_name: string;
  notes: string | null;
  total_minor: number;
  currency: string;
  order_type: string;
  source: string;
  status: string;
  payment_status: string;
  quoted_pickup_time: Date | string | null;
  pickup_time: Date | string | null;
  requested_pickup_not_before?: Date | string | null;
  completed_at: Date | string | null;
  edit_token: string | null;
  parent_order_id: string | null;
  stripe_checkout_session_id: string | null;
  eta_mode?: string | null;
  details_pending?: boolean;
  cancel_reason?: string | null;
  board_opened_at?: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
};

export type OrderItemRowDb = {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  item_name: string;
  quantity: number;
  unit_price_minor: number;
  modifiers: unknown;
  allergens: string[];
  notes: string | null;
  category?: string | null;
  created_at: Date | string;
};

function toIso(value: Date | string | null): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function parseModifiers(raw: unknown): NormalisedOrderLineModifier[] {
  if (!Array.isArray(raw)) return [];
  const out: NormalisedOrderLineModifier[] = [];
  for (const m of raw) {
    if (!m || typeof m !== 'object') continue;
    const o = m as Record<string, unknown>;
    if (typeof o.groupId === 'string' && typeof o.optionId === 'string') {
      out.push({
        groupId: o.groupId,
        groupName: typeof o.groupName === 'string' ? o.groupName : '',
        optionId: o.optionId,
        optionName: typeof o.optionName === 'string' ? o.optionName : '',
        priceMinor: typeof o.priceMinor === 'number' ? o.priceMinor : 0,
        posOptionId: typeof o.posOptionId === 'string' ? o.posOptionId : null,
        colorHex: typeof o.colorHex === 'string' ? o.colorHex : null,
        chipLabel: typeof o.chipLabel === 'string' ? o.chipLabel : null,
        isSize: o.isSize === true,
        isDefault: o.isDefault === true,
      });
      continue;
    }
    /* Legacy snapshot: id + name */
    if (typeof o.id === 'string' && typeof o.name === 'string') {
      out.push({
        groupId: '',
        groupName: '',
        optionId: o.id,
        optionName: o.name,
        priceMinor: typeof o.priceMinor === 'number' ? o.priceMinor : 0,
        posOptionId: typeof o.posOptionId === 'string' ? o.posOptionId : null,
        colorHex: typeof o.colorHex === 'string' ? o.colorHex : null,
        chipLabel: typeof o.chipLabel === 'string' ? o.chipLabel : null,
        isSize: o.isSize === true,
        isDefault: o.isDefault === true,
      });
    }
  }
  return out;
}

export function mapPickupWindow(row: OrderRowDb): PickupWindow {
  const mode = row.eta_mode === 'manual_override' ? 'manual_override' : 'auto';
  return {
    quotedPickupTime: toIso(row.quoted_pickup_time),
    pickupTime: toIso(row.pickup_time),
    completedAt: toIso(row.completed_at),
    etaMode: mode as EtaMode,
  };
}

export function mapOrderItemRow(row: OrderItemRowDb): NormalisedOrderItem {
  return {
    id: row.id,
    menuItemId: row.menu_item_id,
    itemName: row.item_name,
    quantity: row.quantity,
    unitPriceMinor: row.unit_price_minor,
    modifiers: parseModifiers(row.modifiers),
    allergens: row.allergens ?? [],
    notes: row.notes,
    category: row.category ?? null,
  };
}

function mapCancelReason(raw: string | null | undefined): OrderCancelReason | null {
  if (typeof raw !== 'string') return null;
  return CANCEL_REASONS.has(raw as OrderCancelReason) ? (raw as OrderCancelReason) : null;
}

export function mapOrderRow(row: OrderRowDb, items: NormalisedOrderItem[]): NormalisedOrder {
  return {
    id: row.id,
    cafeId: row.cafe_id,
    source: row.source as OrderSource,
    customerName: row.customer_name,
    customerId: row.user_id,
    items,
    notes: row.notes,
    orderType: row.order_type as OrderType,
    status: row.status as OrderStatus,
    cancelReason: mapCancelReason(row.cancel_reason),
    paymentStatus: row.payment_status as PaymentStatus,
    totalMinor: row.total_minor,
    currency: row.currency,
    pickup: mapPickupWindow(row),
    createdAt: toIso(row.created_at)!,
    updatedAt: toIso(row.updated_at)!,
    posOrderId: row.pos_order_id,
    editToken: row.edit_token,
    parentOrderId: row.parent_order_id,
    detailsPending: row.details_pending === true,
  };
}
