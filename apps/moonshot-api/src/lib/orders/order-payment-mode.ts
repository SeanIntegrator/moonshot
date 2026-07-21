import type { OrderAheadFeatureConfig } from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import { ApiHttpError } from '../http-errors.js';

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
