import type { AdminCreateKdsUserRequest, AdminCreateKdsUserResponse, AdminOnboardingStatusResponse, AdminRegisterRequest, AdminRegisterResponse, SlugAvailableResponse } from '@moonshot/types';
import type { AdminSaveMenuTemplateRequest, AdminSaveMenuTemplateResponse } from '@moonshot/domain';
import { apiUrl, parseEnvelope } from './http.js';

export async function checkSlugAvailable(slug: string): Promise<SlugAvailableResponse> {
  const res = await fetch(
    apiUrl(`/admin/onboarding/slug-available?slug=${encodeURIComponent(slug)}`),
  );
  const envelope = await parseEnvelope<SlugAvailableResponse>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Slug check failed (${res.status})`);
  }
  return envelope.data;
}

export async function adminRegister(body: AdminRegisterRequest): Promise<AdminRegisterResponse> {
  const res = await fetch(apiUrl('/admin/onboarding/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const envelope = await parseEnvelope<AdminRegisterResponse>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Registration failed (${res.status})`);
  }
  return envelope.data;
}

export async function adminOnboardingStatus(token: string): Promise<AdminOnboardingStatusResponse> {
  const res = await fetch(apiUrl('/admin/onboarding/status'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const envelope = await parseEnvelope<AdminOnboardingStatusResponse>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Status failed (${res.status})`);
  }
  return envelope.data;
}

export async function adminCompleteOnboarding(token: string): Promise<void> {
  const res = await fetch(apiUrl('/admin/onboarding/complete'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const envelope = await parseEnvelope<{ completed: boolean }>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Complete failed (${res.status})`);
  }
}

export async function adminCreateKdsUser(
  token: string,
  body: AdminCreateKdsUserRequest,
): Promise<AdminCreateKdsUserResponse> {
  const res = await fetch(apiUrl('/admin/onboarding/kds-users'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const envelope = await parseEnvelope<AdminCreateKdsUserResponse>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `KDS user failed (${res.status})`);
  }
  return envelope.data;
}

export async function adminSaveMenuTemplate(
  token: string,
  body: AdminSaveMenuTemplateRequest,
): Promise<AdminSaveMenuTemplateResponse> {
  const res = await fetch(apiUrl('/admin/onboarding/menu-template'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const envelope = await parseEnvelope<AdminSaveMenuTemplateResponse>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Menu template failed (${res.status})`);
  }
  return envelope.data;
}
