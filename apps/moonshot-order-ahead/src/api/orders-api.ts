import type {
  CancelOrderResponse,
  CreateOrderRequest,
  CreateOrderResponse,
  CustomerOrdersListResponse,
  NormalisedOrder,
  PickupEstimateResponse,
} from '@moonshot/types';
import { apiFetch } from '../lib/api.js';

export function fetchCustomerOrders(): Promise<CustomerOrdersListResponse> {
  return apiFetch<CustomerOrdersListResponse>('/orders/me');
}

export function fetchCustomerOrder(
  orderId: string,
  trackingToken?: string | null,
): Promise<{ order: NormalisedOrder }> {
  const q =
    trackingToken != null && trackingToken.trim()
      ? `?trackingToken=${encodeURIComponent(trackingToken.trim())}`
      : '';
  return apiFetch<{ order: NormalisedOrder }>(`/orders/${encodeURIComponent(orderId)}${q}`);
}

export function cancelCustomerOrder(
  orderId: string,
  trackingToken?: string | null,
): Promise<CancelOrderResponse> {
  const q =
    trackingToken != null && trackingToken.trim()
      ? `?trackingToken=${encodeURIComponent(trackingToken.trim())}`
      : '';
  return apiFetch<CancelOrderResponse>(`/orders/${encodeURIComponent(orderId)}/cancel${q}`, {
    method: 'POST',
  });
}

export function fetchPickupEstimate(): Promise<PickupEstimateResponse> {
  return apiFetch<PickupEstimateResponse>('/orders/pickup-estimate');
}

export function createCustomerOrder(body: CreateOrderRequest): Promise<CreateOrderResponse> {
  return apiFetch<CreateOrderResponse>('/orders', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function restoreOrderFromCheckoutSession(sessionId: string): Promise<CreateOrderResponse> {
  return apiFetch<CreateOrderResponse>(
    `/orders/checkout-session/${encodeURIComponent(sessionId.trim())}`,
  );
}
