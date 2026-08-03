/**
 * Admin HTTP auth — café-scoped dashboard (distinct from customer Google JWT and KDS JWT).
 */

/** JWT payload for pre-seeded / invite-based admin sessions. */
export interface AdminJwtClaims {
  /** Subject — same as adminUserId */
  sub: string;
  adminUserId: string;
  cafeId: string;
  cafeSlug: string;
  email: string;
  purpose: 'admin';
  iat?: number;
  exp?: number;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  token: string;
  cafe: { id: string; slug: string; name: string };
  adminUser: { id: string; email: string; displayName: string | null };
}

export interface AdminRegisterRequest {
  cafeName: string;
  /** Optional — server derives from cafeName when omitted. */
  cafeSlug?: string;
  email: string;
  password: string;
  timezone?: string;
}

export type AdminRegisterResponse = AdminLoginResponse;

export interface SlugAvailableResponse {
  available: boolean;
  slug: string;
}

export interface AdminOnboardingStatusResponse {
  completed: boolean;
  hasKdsUser: boolean;
  hasMenuItem: boolean;
}

export interface AdminCreateKdsUserRequest {
  /** Defaults to `barista` when omitted. */
  username?: string;
  /** When omitted, the server generates a password and returns it once. */
  password?: string;
}

export interface AdminCreateKdsUserResponse {
  username: string;
  /** Present only when the server generated the password. */
  password?: string;
}
