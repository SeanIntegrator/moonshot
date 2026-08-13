import type { KdsAdvanceStatusRequest, KdsAdvanceStatusResponse, KdsCompleteOrderResponse, KdsConfigResponse, KdsLoginRequest, KdsLoginResponse, KdsOrdersResponse, KdsRecallOrderRequest, KdsRecallOrderResponse, KdsRecentOrdersResponse } from '@moonshot/types';
import { API_VERSION_PREFIX } from '@moonshot/domain';
import { parseEnvelope, requireApiBaseUrl } from '@moonshot/web-runtime';
import { getApiBaseUrl } from './runtime-config.js';

export { getApiBaseUrl };

function requireBase(): string {
  return requireApiBaseUrl(import.meta.env.VITE_API_URL);
}

export async function kdsLogin(body: KdsLoginRequest): Promise<KdsLoginResponse> {
  const base = requireBase();
  const url = `${base}${API_VERSION_PREFIX}/kds/auth/login`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await parseEnvelope<KdsLoginResponse>(res);
  if (!json.ok) throw new Error(json.error ?? 'Login failed');
  return json.data;
}

export async function kdsFetchOrders(token: string): Promise<KdsOrdersResponse> {
  const base = requireBase();
  const url = `${base}${API_VERSION_PREFIX}/kds/orders`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    throw new Error('SESSION_EXPIRED');
  }
  const json = await parseEnvelope<KdsOrdersResponse>(res);
  if (!json.ok) throw new Error(json.error ?? 'Failed to load orders');
  return json.data;
}

export async function kdsFetchRecentOrders(token: string): Promise<KdsRecentOrdersResponse> {
  const base = requireBase();
  const url = `${base}${API_VERSION_PREFIX}/kds/orders/recent`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    throw new Error('SESSION_EXPIRED');
  }
  const json = await parseEnvelope<KdsRecentOrdersResponse>(res);
  if (!json.ok) throw new Error(json.error ?? 'Failed to load recent orders');
  return json.data;
}

export async function kdsFetchConfig(token: string): Promise<KdsConfigResponse> {
  const base = requireBase();
  const url = `${base}${API_VERSION_PREFIX}/kds/config`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    throw new Error('SESSION_EXPIRED');
  }
  const json = await parseEnvelope<KdsConfigResponse>(res);
  if (!json.ok) throw new Error(json.error ?? 'Failed to load KDS config');
  return json.data;
}

export async function kdsCompleteOrder(
  token: string,
  orderId: string,
): Promise<KdsCompleteOrderResponse> {
  const base = requireBase();
  const url = `${base}${API_VERSION_PREFIX}/kds/orders/${encodeURIComponent(orderId)}/complete`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    throw new Error('SESSION_EXPIRED');
  }
  const json = await parseEnvelope<KdsCompleteOrderResponse>(res);
  if (!json.ok) throw new Error(json.error ?? 'Complete failed');
  return json.data;
}

export async function kdsRecallOrder(
  token: string,
  orderId: string,
  body: KdsRecallOrderRequest = {},
): Promise<KdsRecallOrderResponse> {
  const base = requireBase();
  const url = `${base}${API_VERSION_PREFIX}/kds/orders/${encodeURIComponent(orderId)}/recall`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (res.status === 401) {
    throw new Error('SESSION_EXPIRED');
  }
  const json = await parseEnvelope<KdsRecallOrderResponse>(res);
  if (!json.ok) throw new Error(json.error ?? 'Recall failed');
  return json.data;
}

export async function kdsAdvanceOrderStatus(
  token: string,
  orderId: string,
  status: KdsAdvanceStatusRequest['status'],
): Promise<KdsAdvanceStatusResponse> {
  const base = requireBase();
  const url = `${base}${API_VERSION_PREFIX}/kds/orders/${encodeURIComponent(orderId)}/status`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status } satisfies KdsAdvanceStatusRequest),
  });
  if (res.status === 401) {
    throw new Error('SESSION_EXPIRED');
  }
  const json = await parseEnvelope<KdsAdvanceStatusResponse>(res);
  if (!json.ok) throw new Error(json.error ?? 'Status update failed');
  return json.data;
}
