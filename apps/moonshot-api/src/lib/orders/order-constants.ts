import type { CreateOrderLineInput, OrderType } from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import { ApiHttpError } from '../http-errors.js';
import { UUID_RE } from '../uuid.js';

export { UUID_RE };

export const ORDER_TYPES: OrderType[] = ['takeaway', 'eat_in'];

/** Orders visible on KDS board before completion */
export const KDS_OPEN_ORDER_STATUSES = ['confirmed', 'preparing', 'ready'] as const;

/** Open tickets older than this are omitted from the live board and recall-last. */
export const KDS_OPEN_MAX_AGE_HOURS = 16;

/** Alias — same open statuses that can be marked Done on the KDS. */
export const COMPLETABLE_STATUSES = KDS_OPEN_ORDER_STATUSES;

export const CUSTOMER_ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready'] as const;

export const CUSTOMER_CANCELLABLE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready'] as const;

export const CUSTOMER_TERMINAL_STATUSES = ['completed', 'cancelled'] as const;

/** Shared `orders` projection used across read/write paths. */
export const ORDER_SELECT_COLUMNS = `
  id, cafe_id, user_id, pos_order_id, customer_name, notes, total_minor, currency,
  order_type, source, status, payment_status, quoted_pickup_time, pickup_time,
  requested_pickup_not_before, completed_at, edit_token, parent_order_id,
  stripe_checkout_session_id, eta_mode, details_pending, cancel_reason,
  created_at, updated_at
`;

export const ORDER_ITEM_SELECT_COLUMNS = `
  id, order_id, menu_item_id, item_name, quantity, unit_price_minor,
  modifiers, allergens, notes, category, created_at
`;

export function validateOrderLines(lines: CreateOrderLineInput[]): void {
  if (lines.length === 0) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Order must include at least one line item');
  }
  for (const line of lines) {
    if (!line.menuItemId?.trim() || !UUID_RE.test(line.menuItemId)) {
      throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Each item requires a valid menuItemId UUID');
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new ApiHttpError(
        400,
        ApiErrorCode.VALIDATION,
        'Each item requires quantity as a positive integer',
      );
    }
  }
}

export function assertValidOrderType(orderType: OrderType): void {
  if (!ORDER_TYPES.includes(orderType)) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Invalid orderType');
  }
}

export function assertCustomerName(customerName: string): string {
  const trimmedName = customerName.trim();
  if (!trimmedName) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'customerName is required');
  }
  return trimmedName;
}
