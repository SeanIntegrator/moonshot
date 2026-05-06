import { describe, expect, it } from 'vitest';
import {
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
