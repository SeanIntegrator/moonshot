/**
 * HTTP API envelope and auth claims shared by moonshotApi and clients.
 */

import type { FeatureFlagKey } from './feature-flags.js';

/** Stable machine-readable API error codes */
export const ApiErrorCode = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION: 'VALIDATION',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  CONFIG: 'CONFIG',
  INTERNAL: 'INTERNAL',
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export type ApiSuccess<T> = { ok: true; data: T };

export type ApiFailure = {
  ok: false;
  error: string;
  code?: ApiErrorCode;
  details?: Record<string, unknown>;
};

export type ApiEnvelope<T> = ApiSuccess<T> | ApiFailure;

/** JWT payload shape issued by moonshotApi (Google OAuth → session). */
export interface JwtClaims {
  /** Subject (JWT std) — same as user id in our system */
  sub: string;
  userId: string;
  email?: string;
  /** Cafés this user may administer (future); customers may omit */
  adminCafeIds?: string[];
  iat?: number;
  exp?: number;
}

/** Resolved per request after cafeContext middleware */
export interface RequestCafeContext {
  cafeId: string;
  slug: string;
  /** Subset of `cafes.features` relevant to route handlers */
  enabledFlags?: FeatureFlagKey[];
}
