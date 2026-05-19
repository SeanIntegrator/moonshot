import { describe, expect, it } from 'vitest';
import {
  buildGuestTrackingTokenIfNeeded,
  classifyCustomerSocketToken,
  signTrackOrderJwt,
} from './customer-socket-token.js';

const SECRET = 'test-secret-at-least-32-chars-long!!';

describe('classifyCustomerSocketToken', () => {
  it('recognises signed track_order JWT', () => {
    const orderId = '123e4567-e89b-12d3-a456-426614174000';
    const cafeId = '123e4567-e89b-12d3-a456-426614174001';
    const tok = signTrackOrderJwt({ orderId, cafeId, secret: SECRET });
    const c = classifyCustomerSocketToken(tok, SECRET);
    expect(c.kind).toBe('track_order');
    if (c.kind === 'track_order') {
      expect(c.claims.orderId).toBe(orderId);
      expect(c.claims.cafeId).toBe(cafeId);
    }
  });

  it('rejects wrong verification secret', () => {
    const tok = signTrackOrderJwt({
      orderId: '123e4567-e89b-12d3-a456-426614174000',
      cafeId: '123e4567-e89b-12d3-a456-426614174001',
      secret: SECRET,
    });
    expect(classifyCustomerSocketToken(tok, `${SECRET}x`).kind).toBe('invalid');
  });
  it('rejects empty token', () => {
    expect(classifyCustomerSocketToken('', SECRET).kind).toBe('invalid');
    expect(classifyCustomerSocketToken('   ', SECRET).kind).toBe('invalid');
  });

  it('recognises session-shaped JWT without purpose', async () => {
    const jwt = (await import('jsonwebtoken')).default;
    const tok = jwt.sign({ sub: 'user-uuid', userId: 'user-uuid' }, SECRET, { expiresIn: '1h' });
    const c = classifyCustomerSocketToken(tok, SECRET);
    expect(c.kind).toBe('session');
    if (c.kind === 'session') expect(c.userId).toBe('user-uuid');
  });

  it('rejects kds purpose tokens', async () => {
    const jwt = (await import('jsonwebtoken')).default;
    const tok = jwt.sign(
      {
        purpose: 'kds',
        sub: 'x',
        kdsUserId: 'x',
        cafeId: '123e4567-e89b-12d3-a456-426614174001',
        cafeSlug: 'c',
      },
      SECRET,
    );
    expect(classifyCustomerSocketToken(tok, SECRET).kind).toBe('invalid');
  });
});

describe('buildGuestTrackingTokenIfNeeded', () => {
  const orderId = '123e4567-e89b-12d3-a456-426614174000';
  const cafeId = '123e4567-e89b-12d3-a456-426614174001';

  it('returns null for signed-in customers', () => {
    const token = buildGuestTrackingTokenIfNeeded({
      orderId,
      cafeId,
      customerId: 'user-uuid',
      jwtSecret: SECRET,
    });
    expect(token).toBeNull();
  });

  it('returns null when JWT secret is missing (dev fallback)', () => {
    const token = buildGuestTrackingTokenIfNeeded({
      orderId,
      cafeId,
      customerId: null,
      jwtSecret: undefined,
    });
    expect(token).toBeNull();
  });

  it('signs a track_order JWT for guests when secret is configured', () => {
    const token = buildGuestTrackingTokenIfNeeded({
      orderId,
      cafeId,
      customerId: null,
      jwtSecret: SECRET,
    });
    expect(token).not.toBeNull();
    const classified = classifyCustomerSocketToken(token!, SECRET);
    expect(classified.kind).toBe('track_order');
    if (classified.kind === 'track_order') {
      expect(classified.claims.orderId).toBe(orderId);
      expect(classified.claims.cafeId).toBe(cafeId);
    }
  });
});
