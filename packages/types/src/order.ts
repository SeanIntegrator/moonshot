/**
 * Normalised order types — canonical shape across channels and KDS.
 */

/** ISO 8601 datetime string */
export type IsoDateTime = string;

export type OrderSource = 'app' | 'pos' | 'whatsapp' | 'web';

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled';

export type OrderType = 'takeaway' | 'eat_in';

export type PaymentStatus = 'unpaid' | 'paid' | 'refunded' | 'partially_refunded';

export type EtaMode = 'auto' | 'manual_override';

/**
 * Pickup / completion timing. `pickupTime` is the live ETA (auto-updated in v1).
 */
export interface PickupWindow {
  quotedPickupTime: IsoDateTime | null;
  pickupTime: IsoDateTime | null;
  completedAt: IsoDateTime | null;
  etaMode: EtaMode;
}

/** Selected modifier on a line — denormalised for KDS + receipts */
export interface NormalisedOrderLineModifier {
  id: string;
  name: string;
  /** Minor units */
  priceMinor: number;
  posOptionId?: string | null;
}

export interface NormalisedOrderItem {
  /** Internal UUID for this line */
  id: string;
  menuItemId: string | null;
  posVariationId?: string | null;
  itemName: string;
  quantity: number;
  unitPriceMinor: number;
  modifiers: NormalisedOrderLineModifier[];
  /** Per-item allergens (v2); KDS summary is derived */
  allergens: string[];
  notes: string | null;
}

/**
 * Derived read-model: union of allergen strings across lines (not stored in DB).
 */
export interface OrderAllergySummary {
  byLineItem: Array<{ lineItemId: string; allergens: string[] }>;
  union: string[];
}

export interface NormalisedOrder {
  id: string;
  cafeId: string;
  source: OrderSource;
  customerName: string;
  customerId: string | null;
  items: NormalisedOrderItem[];
  notes: string | null;
  orderType: OrderType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totalMinor: number;
  currency: string;
  pickup: PickupWindow;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  /** Square / POS external id — dedupe key with cafeId */
  posOrderId: string | null;
  /** Secret token for PATCH merge flow */
  editToken: string | null;
  /** When this row is an add-on payment linked to a prior checkout */
  parentOrderId: string | null;
}
