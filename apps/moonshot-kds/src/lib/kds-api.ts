import {
  API_VERSION_PREFIX,
  type ApiEnvelope,
  type KdsAdvanceStatusRequest,
  type KdsAdvanceStatusResponse,
  type KdsCompleteOrderResponse,
  type KdsConfigResponse,
  type KdsLoginRequest,
  type KdsLoginResponse,
  type KdsOrdersResponse,
  type KdsRecallLastOrderResponse,
  type KdsRecallOrderResponse,
  type KdsRecentOrdersResponse,
} from '@moonshot/types';
import { getApiBaseUrl } from './runtime-config.js';

export { getApiBaseUrl };

async function parseEnvelope<T>(res: Response): Promise<ApiEnvelope<T>> {
  const contentType = res.headers.get('content-type') ?? '';
  const text = await res.text();
  const start = text.trimStart();
  if (
    contentType.includes('text/html') ||
    start.startsWith('<') ||
    start.toLowerCase().startsWith('<!doctype')
  ) {
    throw new Error(
      'Server returned HTML. Set VITE_API_URL to the API origin (e.g. http://localhost:3000).',
    );
  }
  let parsed: unknown;
  try {
    parsed = text.length ? JSON.parse(text) : null;
  } catch {
    throw new Error('Invalid JSON from API');
  }
  return parsed as ApiEnvelope<T>;
}

export async function kdsLogin(body: KdsLoginRequest): Promise<KdsLoginResponse> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL is not set');
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
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL is not set');
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
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL is not set');
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
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL is not set');
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
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL is not set');
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

export async function kdsRecallLastOrder(token: string): Promise<KdsRecallLastOrderResponse> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL is not set');
  const url = `${base}${API_VERSION_PREFIX}/kds/orders/recall-last`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    throw new Error('SESSION_EXPIRED');
  }
  const json = await parseEnvelope<KdsRecallLastOrderResponse>(res);
  if (!json.ok) throw new Error(json.error ?? 'Recall failed');
  return json.data;
}

export async function kdsRecallOrder(
  token: string,
  orderId: string,
): Promise<KdsRecallOrderResponse> {
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL is not set');
  const url = `${base}${API_VERSION_PREFIX}/kds/orders/${encodeURIComponent(orderId)}/recall`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
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
  const base = getApiBaseUrl();
  if (!base) throw new Error('VITE_API_URL is not set');
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
