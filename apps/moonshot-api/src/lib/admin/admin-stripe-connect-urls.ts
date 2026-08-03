import jwt from 'jsonwebtoken';
import { ApiErrorCode } from '@moonshot/types';
import { ApiHttpError } from './http-errors.js';
import { parseAllowedOrigins } from './cors-origins.js';

const STRIPE_CONNECT_STATE_PURPOSE = 'stripe_connect_state';

/** Signed `state` query param on Stripe Account Link return/refresh URLs (no admin JWT in browser). */
export function signStripeConnectState(cafeId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new ApiHttpError(500, ApiErrorCode.CONFIG, 'Server JWT configuration missing');
  }
  return jwt.sign({ cafeId, purpose: STRIPE_CONNECT_STATE_PURPOSE }, secret, { expiresIn: '7d' });
}

export function verifyStripeConnectState(state: string): string | null {
  const secret = process.env.JWT_SECRET;
  if (!secret || !state.trim()) return null;
  try {
    const payload = jwt.verify(state.trim(), secret);
    if (typeof payload !== 'object' || payload === null) return null;
    const p = payload as Record<string, unknown>;
    if (p.purpose !== STRIPE_CONNECT_STATE_PURPOSE || typeof p.cafeId !== 'string') return null;
    return p.cafeId;
  } catch {
    return null;
  }
}

/** Append signed café id to env-configured callback base URL. */
export function buildStripeConnectCallbackUrl(baseUrl: string, cafeId: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set('state', signStripeConnectState(cafeId));
  return url.toString();
}

/** Where to send the browser after return/refresh handling (admin SPA root). */
export function resolveStripeConnectAdminRedirectUrl(): string {
  const explicit = process.env.STRIPE_CONNECT_ADMIN_REDIRECT_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const fromCors = parseAllowedOrigins(process.env.CORS_ORIGINS).find((o) =>
    /admin/i.test(o),
  );
  if (fromCors) return fromCors.replace(/\/$/, '');

  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:5174/onboarding';
  }

  throw new ApiHttpError(
    500,
    ApiErrorCode.CONFIG,
    'STRIPE_CONNECT_ADMIN_REDIRECT_URL must be set (or include admin origin in CORS_ORIGINS)',
  );
}

export function adminRedirectWithStripeQuery(
  outcome: 'return' | 'refresh' | 'error',
): string {
  const base = resolveStripeConnectAdminRedirectUrl();
  const url = new URL(base);
  // Origin-only redirect URLs would land on `/`, and the admin SPA then navigates to
  // `/onboarding` — which used to drop `?stripeConnect=…`. Always target the wizard.
  if (url.pathname === '/' || url.pathname === '') {
    url.pathname = '/onboarding';
  }
  url.searchParams.set('stripeConnect', outcome);
  return url.toString();
}
