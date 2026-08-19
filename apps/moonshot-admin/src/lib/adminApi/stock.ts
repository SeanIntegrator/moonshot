import type { AdminStockOptionPutBody, AdminStockResponse, StockAvailability } from '@moonshot/types';
import { adminFetch } from './http.js';

export async function fetchAdminStock(token: string): Promise<AdminStockResponse> {
  return adminFetch<AdminStockResponse>('/admin/stock', {
    token,
    errorMessage: 'Failed to load stock',
  });
}

export async function putAdminStockOption(
  token: string,
  optionId: string,
  availability: StockAvailability,
): Promise<AdminStockResponse> {
  const body: AdminStockOptionPutBody = { availability };
  return adminFetch<AdminStockResponse>(`/admin/stock/options/${encodeURIComponent(optionId)}`, {
    token,
    method: 'PUT',
    json: body,
    errorMessage: 'Could not update stock',
  });
}
