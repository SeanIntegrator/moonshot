import type {
  AdminStripeAccountLinkResponse,
  AdminStripeAccountStatusResponse,
} from '@moonshot/types';
import { adminFetch } from './http.js';

export async function adminStripeOnboardingLink(token: string): Promise<AdminStripeAccountLinkResponse> {
  return adminFetch<AdminStripeAccountLinkResponse>('/admin/payments/stripe/onboarding-link', {
    token,
    method: 'POST',
    errorMessage: 'Stripe link failed',
  });
}

export async function adminStripeStatus(token: string): Promise<AdminStripeAccountStatusResponse> {
  return adminFetch<AdminStripeAccountStatusResponse>('/admin/payments/stripe/status', {
    token,
    errorMessage: 'Stripe status failed',
  });
}
