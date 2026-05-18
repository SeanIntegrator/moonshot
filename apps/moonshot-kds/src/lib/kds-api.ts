import {
  API_VERSION_PREFIX,
  type ApiEnvelope,
  type KdsCompleteOrderResponse,
  type KdsLoginRequest,
  type KdsLoginResponse,
  type KdsOrdersResponse,
} from '@moonshot/types';

function normalizeApiBaseUrl(raw: string | undefined): string {
  const s = (raw ?? '').trim();
  if (!s) return '';
  return s.replace(/\/+$/, '');
}

export function getApiBaseUrl(): string {
  return normalizeApiBaseUrl(import.meta.env.VITE_API_URL);
}

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

export async function kdsCompleteOrder(token: string, orderId: string): Promise<KdsCompleteOrderResponse> {
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
