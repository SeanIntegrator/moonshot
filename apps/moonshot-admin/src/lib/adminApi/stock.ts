import type { AdminStockOptionPutBody, AdminStockResponse, StockAvailability } from '@moonshot/types';
import { apiUrl, parseEnvelope } from './http.js';

export async function fetchAdminStock(token: string): Promise<AdminStockResponse> {
  const res = await fetch(apiUrl('/admin/stock'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const envelope = await parseEnvelope<AdminStockResponse>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Failed to load stock (${res.status})`);
  }
  return envelope.data;
}

export async function putAdminStockOption(
  token: string,
  optionId: string,
  availability: StockAvailability,
): Promise<AdminStockResponse> {
  const body: AdminStockOptionPutBody = { availability };
  const res = await fetch(apiUrl(`/admin/stock/options/${encodeURIComponent(optionId)}`), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const envelope = await parseEnvelope<AdminStockResponse>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Could not update stock (${res.status})`);
  }
  return envelope.data;
}
