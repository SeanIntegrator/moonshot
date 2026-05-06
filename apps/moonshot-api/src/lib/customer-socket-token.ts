import jwt from 'jsonwebtoken';
import { TRACK_ORDER_JWT_PURPOSE, type TrackOrderJwtClaims } from '@moonshot/types';

export function signTrackOrderJwt(params: {
  orderId: string;
  cafeId: string;
  secret: string;
}): string {
  const { orderId, cafeId, secret } = params;
  const payload: Pick<TrackOrderJwtClaims, 'purpose' | 'orderId' | 'cafeId'> = {
    purpose: TRACK_ORDER_JWT_PURPOSE,
    orderId,
    cafeId,
  };
  return jwt.sign(payload, secret, { expiresIn: '48h' });
}

export type ClassifiedCustomerSocketToken =
  | { kind: 'track_order'; claims: TrackOrderJwtClaims }
  | { kind: 'session'; userId: string }
  | { kind: 'invalid'; reason?: string };

/**
 * Classify JWT for `/customer` socket subscribe (no DB). Used by tests + subscribe handler.
 */
export function classifyCustomerSocketToken(
  token: string,
  secret: string,
): ClassifiedCustomerSocketToken {
  const trimmed = token.trim();
  if (!trimmed) return { kind: 'invalid', reason: 'empty' };
  try {
    const p = jwt.verify(trimmed, secret) as Record<string, unknown>;
    if (p.purpose === 'kds') {
      return { kind: 'invalid', reason: 'kds' };
    }
    if (p.purpose === TRACK_ORDER_JWT_PURPOSE) {
      const orderId = typeof p.orderId === 'string' ? p.orderId : '';
      const cafeId = typeof p.cafeId === 'string' ? p.cafeId : '';
      if (!orderId || !cafeId) {
        return { kind: 'invalid', reason: 'track_claims' };
      }
      const claims: TrackOrderJwtClaims = {
        purpose: TRACK_ORDER_JWT_PURPOSE,
        orderId,
        cafeId,
        iat: typeof p.iat === 'number' ? p.iat : undefined,
        exp: typeof p.exp === 'number' ? p.exp : undefined,
      };
      return {
        kind: 'track_order',
        claims,
      };
    }
    const userId = typeof p.userId === 'string' ? p.userId : '';
    const sub = typeof p.sub === 'string' ? p.sub : '';
    const uid = userId || sub;
    if (!uid) {
      return { kind: 'invalid', reason: 'session' };
    }
    return { kind: 'session', userId: uid };
  } catch {
    return { kind: 'invalid', reason: 'verify' };
  }
}
