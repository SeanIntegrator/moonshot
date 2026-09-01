import { SquareError } from 'square';

/** Seller-safe copy when Square OAuth access is no longer valid. */
export const SQUARE_RECONNECT_MESSAGE = 'Square access expired. Reconnect Square.';

const PERMANENT_AUTH_PATTERNS = [
  'invalid_grant',
  'not_authorized',
  'access_token_revoked',
  'access_token_expired',
  'unauthorized',
  'insufficient_scopes',
] as const;

/**
 * True when a Square API or OAuth call indicates the seller must reconnect.
 * Used by token refresh, catalog sync, and order webhook retrieve.
 */
export function isPermanentSquareAuthFailure(err: unknown): boolean {
  if (err instanceof SquareError) {
    if (err.statusCode === 401 || err.statusCode === 403) return true;
    const body = String(err.message ?? '').toLowerCase();
    if (PERMANENT_AUTH_PATTERNS.some((p) => body.includes(p))) return true;
    const errors = (err as { errors?: Array<{ code?: string }> }).errors;
    if (errors?.some((e) => isSquareErrorCodePermanent(e.code))) return true;
    return false;
  }

  const status = (err as { statusCode?: number })?.statusCode;
  if (status === 401 || status === 403) return true;

  const message = String(err instanceof Error ? err.message : err ?? '').toLowerCase();
  return PERMANENT_AUTH_PATTERNS.some((p) => message.includes(p));
}

function isSquareErrorCodePermanent(code: string | undefined): boolean {
  if (!code) return false;
  const normalised = code.toUpperCase();
  return (
    normalised === 'UNAUTHORIZED' ||
    normalised === 'ACCESS_TOKEN_EXPIRED' ||
    normalised === 'ACCESS_TOKEN_REVOKED' ||
    normalised === 'INSUFFICIENT_SCOPES' ||
    normalised === 'NOT_AUTHORIZED'
  );
}
