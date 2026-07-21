import type {
  AdminStripeAccountLinkResponse,
  AdminStripeAccountStatusResponse,
} from '@moonshot/types';
import { apiUrl, parseEnvelope } from './http.js';

export async function adminStripeOnboardingLink(token: string): Promise<AdminStripeAccountLinkResponse> {
  const res = await fetch(apiUrl('/admin/payments/stripe/onboarding-link'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  const envelope = await parseEnvelope<AdminStripeAccountLinkResponse>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Stripe link failed (${res.status})`);
  }
  return envelope.data;
}

export async function adminStripeStatus(token: string): Promise<AdminStripeAccountStatusResponse> {
  const res = await fetch(apiUrl('/admin/payments/stripe/status'), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const envelope = await parseEnvelope<AdminStripeAccountStatusResponse>(res);
  if (!envelope.ok) {
    throw new Error(envelope.error || `Stripe status failed (${res.status})`);
  }
  return envelope.data;
}
