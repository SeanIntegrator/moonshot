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

/** Selected modifier on an order line — group + option for multi-dimensional customisation */
export interface NormalisedOrderLineModifier {
  /** Modifier group id (from `NormalisedModifierGroup.id`) */
  groupId: string;
  groupName: string;
  /** Selected option id (from `NormalisedModifierOption.id`) */
  optionId: string;
  optionName: string;
  /** Minor units — delta added to base item price for this option; size rows use absolute size price */
  priceMinor: number;
  posOptionId?: string | null;
  /** KDS chip colour/label snapshot at order time */
  colorHex?: string | null;
  chipLabel?: string | null;
  /** True when this row is the selected item size (not a library modifier) */
  isSize?: boolean;
  /** Snapshot of option/size `isDefault` at order time — KDS hides defaults */
  isDefault?: boolean;
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
  /**
   * Menu category snapshotted at create (`hot_drinks` | `cold_drinks` | `food` | …).
   * KDS treats category containing "food" as a food line. Nullable for legacy rows.
   */
  category?: string | null;
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
  /**
   * Square retrieve failed after retries — show "Details pending" on KDS.
   * Cleared on the next successful order snapshot.
   */
  detailsPending: boolean;
}

/**
 * Guest pay-in-store / checkout order creation payload.
 * Prices are derived server-side from `menu_items`. Do not trust client prices.
 *
 * Modifiers: send selected option ids per group; server validates against
 * `modifier_groups` and applies priced deltas.
 */
export interface CreateOrderLineInput {
  menuItemId: string;
  quantity: number;
  /** Required when the menu item has `sizes` */
  sizeId?: string | null;
  /** Selected options keyed by modifier group */
  modifiers?: OrderLineModifierSelectionInput[];
  notes?: string | null;
  /** UK FSA allergen codes declared for this line (`packages/types` allergens list) */
  allergens?: string[];
}

/** Client selection — server resolves names and prices from menu JSON */
export interface OrderLineModifierSelectionInput {
  groupId: string;
  optionId: string;
}


export interface CreateOrderRequest {
  customerName: string;
  notes?: string | null;
  orderType: OrderType;
  items: CreateOrderLineInput[];
  /** Signed-in only: unredeemed loyalty reward to apply as a free-drink discount */
  redeemRewardId?: string | null;
  /**
   * Minutes from now until the customer wants pickup (0 / omitted = ASAP / FIFO only).
   * Server clamps to café `order_ahead.maxPickupMinutes` and stores a not-before floor.
   */
  pickupDelayMinutes?: number;
}

export interface CreateOrderResponse {
  order: NormalisedOrder;
  /**
   * Present for **guest** orders only: sign with `TRACK_ORDER_JWT_PURPOSE` for `/customer` subscribe.
   * Omitted when the order is tied to a logged-in user (`orders.user_id`).
   */
  trackingToken?: string;
  /** Stripe Checkout URL when order is `pending` awaiting payment */
  checkoutUrl?: string;
  /** Minor units discounted when a loyalty reward was applied */
  discountMinor?: number;
  /** Reward row consumed for this order */
  redeemedRewardId?: string;
}
