import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { ApiErrorCode } from '@moonshot/types';
import { ApiHttpError } from '../http-errors.js';
import { parseAllowedOrigins } from '../cors-origins.js';

const SQUARE_CONNECT_STATE_PURPOSE = 'square_connect_state';
/** Authorization codes expire quickly — keep CSRF state short-lived. */
const STATE_TTL = '15m';

export type SquareConnectStateClaims = {
  cafeId: string;
  nonce: string;
  purpose: typeof SQUARE_CONNECT_STATE_PURPOSE;
};

/** Signed `state` query param on Square OAuth authorize/return URLs (no admin JWT in browser). */
export function signSquareConnectState(cafeId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new ApiHttpError(500, ApiErrorCode.CONFIG, 'Server JWT configuration missing');
  }
  const nonce = randomBytes(16).toString('hex');
  return jwt.sign(
    { cafeId, nonce, purpose: SQUARE_CONNECT_STATE_PURPOSE } satisfies SquareConnectStateClaims,
    secret,
    { expiresIn: STATE_TTL },
  );
}

export function verifySquareConnectState(state: string): { cafeId: string; nonce: string } | null {
  const secret = process.env.JWT_SECRET;
  if (!secret || !state.trim()) return null;
  try {
    const payload = jwt.verify(state.trim(), secret);
    if (typeof payload !== 'object' || payload === null) return null;
    const p = payload as Record<string, unknown>;
    if (p.purpose !== SQUARE_CONNECT_STATE_PURPOSE) return null;
    if (typeof p.cafeId !== 'string' || typeof p.nonce !== 'string') return null;
    return { cafeId: p.cafeId, nonce: p.nonce };
  } catch {
    return null;
  }
}

export function resolveSquareOAuthRedirectUrl(): string {
  const explicit = process.env.SQUARE_OAUTH_REDIRECT_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3000/api/v1/admin/connect/square/return';
  }

  throw new ApiHttpError(
    500,
    ApiErrorCode.CONFIG,
    'SQUARE_OAUTH_REDIRECT_URL must be set in production',
  );
}

/** Where to send the browser after Square OAuth return handling (admin SPA). */
export function resolveSquareConnectAdminRedirectUrl(): string {
  const explicit = process.env.SQUARE_CONNECT_ADMIN_REDIRECT_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');

  const fromCors = parseAllowedOrigins(process.env.CORS_ORIGINS).find((o) => /admin/i.test(o));
  if (fromCors) return fromCors.replace(/\/$/, '');

  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:5174/onboarding/import-pos';
  }

  throw new ApiHttpError(
    500,
    ApiErrorCode.CONFIG,
    'SQUARE_CONNECT_ADMIN_REDIRECT_URL must be set (or include admin origin in CORS_ORIGINS)',
  );
}

export function adminRedirectWithSquareQuery(
  outcome: 'connected' | 'error',
  extra?: Record<string, string>,
): string {
  const base = resolveSquareConnectAdminRedirectUrl();
  const url = new URL(base);
  if (url.pathname === '/' || url.pathname === '') {
    url.pathname = '/onboarding/import-pos';
  }
  url.searchParams.set('squareConnect', outcome);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

export function resolveSquareEnvironment(): 'sandbox' | 'production' {
  const raw = (process.env.SQUARE_ENVIRONMENT ?? 'sandbox').trim().toLowerCase();
  return raw === 'production' ? 'production' : 'sandbox';
}

export function resolveSquareApplicationId(): string {
  const id = process.env.SQUARE_APPLICATION_ID?.trim();
  if (!id) {
    throw new ApiHttpError(500, ApiErrorCode.CONFIG, 'SQUARE_APPLICATION_ID is not configured');
  }
  return id;
}

export function resolveSquareApplicationSecret(): string {
  const secret = process.env.SQUARE_APPLICATION_SECRET?.trim();
  if (!secret) {
    throw new ApiHttpError(500, ApiErrorCode.CONFIG, 'SQUARE_APPLICATION_SECRET is not configured');
  }
  return secret;
}

/** Scopes requested at connect time — includes order scopes for the webhook follow-up. */
export const SQUARE_OAUTH_SCOPES = [
  'MERCHANT_PROFILE_READ',
  'ITEMS_READ',
  'ORDERS_READ',
  'ORDERS_WRITE',
  'PAYMENTS_READ',
] as const;

export function buildSquareAuthorizeUrl(cafeId: string): { url: string; state: string } {
  const state = signSquareConnectState(cafeId);
  const applicationId = resolveSquareApplicationId();
  const redirectUri = resolveSquareOAuthRedirectUrl();
  const env = resolveSquareEnvironment();
  const host =
    env === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';

  const url = new URL(`${host}/oauth2/authorize`);
  url.searchParams.set('client_id', applicationId);
  url.searchParams.set('scope', SQUARE_OAUTH_SCOPES.join(' '));
  // Sandbox only supports session=true; production requires session=false.
  url.searchParams.set('session', env === 'production' ? 'false' : 'true');
  url.searchParams.set('state', state);
  url.searchParams.set('redirect_uri', redirectUri);
  return { url: url.toString(), state };
}
