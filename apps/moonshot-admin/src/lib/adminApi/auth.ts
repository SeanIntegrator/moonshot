import type { AdminLoginResponse } from '@moonshot/types';
import { apiUrl, parseEnvelope } from './http.js';

export type AdminSessionPayload = Pick<AdminLoginResponse, 'adminUser' | 'cafe'>;

export type AdminMeResponse = AdminSessionPayload;

export async function adminLogin(email: string, password: string): Promise<AdminLoginResponse> {
  const res = await fetch(apiUrl('/admin/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const envelope = await parseEnvelope<AdminLoginResponse>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Login failed (${res.status})`);
  }
  return envelope.data;
}

export async function adminGetMe(token: string): Promise<AdminMeResponse> {
  const res = await fetch(apiUrl('/admin/auth/me'), {
    headers: { Authorization: `Bearer ${token}` },
  });

  const envelope = await parseEnvelope<AdminMeResponse>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Session invalid (${res.status})`);
  }
  return envelope.data;
}
