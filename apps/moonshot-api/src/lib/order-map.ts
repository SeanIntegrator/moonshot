import type {
  NormalisedOrder,
  NormalisedOrderItem,
  NormalisedOrderLineModifier,
  OrderSource,
  OrderStatus,
  OrderType,
  PaymentStatus,
  PickupWindow,
} from '@moonshot/types';

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
  completed_at: Date | string | null;
  edit_token: string | null;
  parent_order_id: string | null;
  stripe_checkout_session_id: string | null;
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
  created_at: Date | string;
};

function toIso(value: Date | string | null): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function parseModifiers(raw: unknown): NormalisedOrderLineModifier[] {
  if (!Array.isArray(raw)) return [];
  return raw as NormalisedOrderLineModifier[];
}

export function mapPickupWindow(row: OrderRowDb): PickupWindow {
  return {
    quotedPickupTime: toIso(row.quoted_pickup_time),
    pickupTime: toIso(row.pickup_time),
    completedAt: toIso(row.completed_at),
    etaMode: 'auto',
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
  };
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
    paymentStatus: row.payment_status as PaymentStatus,
    totalMinor: row.total_minor,
    currency: row.currency,
    pickup: mapPickupWindow(row),
    createdAt: toIso(row.created_at)!,
    updatedAt: toIso(row.updated_at)!,
    posOrderId: row.pos_order_id,
    editToken: row.edit_token,
    parentOrderId: row.parent_order_id,
  };
}
