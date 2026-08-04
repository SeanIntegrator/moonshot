import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  parseSquareWebhookEnvelope,
  resolveSquareWebhookNotificationUrl,
  verifySquareWebhookSignature,
} from './webhook.js';
import { mapSquareEnvelopeToWebhookEvent, squareOrderToSnapshot } from './order-normalise.js';

describe('square webhook signature', () => {
  const notificationUrl = 'https://example.com/api/v1/webhooks/square';
  const signatureKey = 'test-signature-key';
  const body = '{"merchant_id":"ML","type":"order.created","event_id":"evt1"}';

  it('accepts a valid HMAC signature', () => {
    const expected = createHmac('sha256', signatureKey)
      .update(notificationUrl + body, 'utf8')
      .digest('base64');
    expect(
      verifySquareWebhookSignature({
        rawBody: body,
        signatureHeader: expected,
        signatureKey,
        notificationUrl,
      }),
    ).toBe(true);
  });

  it('rejects a bad signature', () => {
    expect(
      verifySquareWebhookSignature({
        rawBody: body,
        signatureHeader: 'not-valid',
        signatureKey,
        notificationUrl,
      }),
    ).toBe(false);
  });

  it('defaults notification URL in non-production', () => {
    const prev = process.env.NODE_ENV;
    const prevUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
    delete process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;
    process.env.NODE_ENV = 'test';
    expect(resolveSquareWebhookNotificationUrl()).toBe(
      'http://localhost:3000/api/v1/webhooks/square',
    );
    process.env.NODE_ENV = prev;
    if (prevUrl !== undefined) process.env.SQUARE_WEBHOOK_NOTIFICATION_URL = prevUrl;
  });
});

describe('parseSquareWebhookEnvelope', () => {
  it('extracts order.created fields', () => {
    const env = parseSquareWebhookEnvelope({
      merchant_id: 'MERCHANT1',
      type: 'order.created',
      event_id: 'ev-1',
      data: {
        type: 'order',
        id: 'ord-1',
        object: {
          order_created: {
            order_id: 'ord-1',
            version: 1,
            location_id: 'LOC',
            state: 'OPEN',
          },
        },
      },
    });
    expect(env).toEqual({
      eventId: 'ev-1',
      merchantId: 'MERCHANT1',
      type: 'order.created',
      orderId: 'ord-1',
    });
  });

  it('extracts catalog.version.updated without an order id', () => {
    const env = parseSquareWebhookEnvelope({
      merchant_id: 'MERCHANT1',
      type: 'catalog.version.updated',
      event_id: 'ev-cat-1',
      data: {
        type: 'catalog_version',
        id: '',
        object: {
          catalog_version: {
            updated_at: '2026-07-01T12:00:00Z',
          },
        },
      },
    });
    expect(env).toEqual({
      eventId: 'ev-cat-1',
      merchantId: 'MERCHANT1',
      type: 'catalog.version.updated',
      orderId: null,
    });
  });

  it('returns null when required fields missing', () => {
    expect(parseSquareWebhookEnvelope({ type: 'order.created' })).toBeNull();
  });
});

describe('mapSquareEnvelopeToWebhookEvent', () => {
  it('maps open orders to order_open_or_updated', () => {
    const event = mapSquareEnvelopeToWebhookEvent({
      cafeId: 'cafe-1',
      envelope: {
        eventId: 'e',
        merchantId: 'm',
        type: 'order.updated',
        orderId: 'ord-9',
      },
      order: {
        id: 'ord-9',
        state: 'OPEN',
        ticketName: 'Sean',
        totalMoney: { amount: 350n, currency: 'GBP' },
        lineItems: [
          {
            uid: 'li1',
            name: 'Latte',
            quantity: '1',
            basePriceMoney: { amount: 350n, currency: 'GBP' },
            modifiers: [{ uid: 'm1', name: 'Oat', basePriceMoney: { amount: 0n } }],
          },
        ],
      },
    });
    expect(event.kind).toBe('order_open_or_updated');
    if (event.kind === 'order_open_or_updated') {
      expect(event.posOrderId).toBe('ord-9');
      expect(event.snapshot?.customerName).toBe('Sean');
      expect(event.snapshot?.items?.[0]?.itemName).toBe('Latte');
    }
  });

  it('maps canceled orders to order_removed', () => {
    const event = mapSquareEnvelopeToWebhookEvent({
      cafeId: 'cafe-1',
      envelope: {
        eventId: 'e',
        merchantId: 'm',
        type: 'order.updated',
        orderId: 'ord-9',
      },
      order: { id: 'ord-9', state: 'CANCELED' },
    });
    expect(event).toEqual({
      kind: 'order_removed',
      cafeId: 'cafe-1',
      posOrderId: 'ord-9',
    });
  });

  it('ignores non-order types', () => {
    const event = mapSquareEnvelopeToWebhookEvent({
      cafeId: 'cafe-1',
      envelope: {
        eventId: 'e',
        merchantId: 'm',
        type: 'catalog.version.updated',
        orderId: null,
      },
      order: null,
    });
    expect(event.kind).toBe('ignored');
  });
});

describe('squareOrderToSnapshot', () => {
  it('builds a usable snapshot', () => {
    const snap = squareOrderToSnapshot('cafe-1', {
      id: 'o1',
      state: 'OPEN',
      totalMoney: { amount: 100n, currency: 'GBP' },
      lineItems: [{ uid: 'a', name: 'Tea', quantity: '2', basePriceMoney: { amount: 50n } }],
    });
    expect(snap.totalMinor).toBe(100);
    expect(snap.items).toHaveLength(1);
    expect(snap.items![0]!.quantity).toBe(2);
  });

  it('maps order-level and line-level notes', () => {
    const snap = squareOrderToSnapshot('cafe-1', {
      id: 'o1',
      note: 'Table 4 — extra napkins',
      totalMoney: { amount: 350n, currency: 'GBP' },
      lineItems: [
        {
          uid: 'li1',
          name: 'Latte',
          quantity: '1',
          note: 'No sugar',
          basePriceMoney: { amount: 350n },
        },
      ],
    });
    expect(snap.notes).toBe('Table 4 — extra napkins');
    expect(snap.items![0]!.notes).toBe('No sugar');
  });

  it('normalises empty and whitespace-only notes to null', () => {
    const snap = squareOrderToSnapshot('cafe-1', {
      id: 'o1',
      note: '   ',
      totalMoney: { amount: 100n, currency: 'GBP' },
      lineItems: [
        {
          uid: 'li1',
          name: 'Tea',
          quantity: '1',
          note: '',
          basePriceMoney: { amount: 100n },
        },
      ],
    });
    expect(snap.notes).toBeNull();
    expect(snap.items![0]!.notes).toBeNull();
  });
});

describe('mapSquareEnvelopeToWebhookEvent empty fetch fallback', () => {
  it('builds an empty stub snapshot when order fetch is missing', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const event = mapSquareEnvelopeToWebhookEvent({
      cafeId: 'cafe-1',
      envelope: {
        eventId: 'e',
        merchantId: 'm',
        type: 'order.updated',
        orderId: 'ord-missing',
      },
      order: null,
    });
    expect(event.kind).toBe('order_open_or_updated');
    if (event.kind === 'order_open_or_updated') {
      expect(event.posOrderId).toBe('ord-missing');
      expect(event.snapshot?.notes).toBeNull();
      expect(event.snapshot?.items).toEqual([]);
    }
    expect(warn).toHaveBeenCalledWith(
      '[square-order] square_order_fetch_missing',
      expect.objectContaining({ cafeId: 'cafe-1', posOrderId: 'ord-missing' }),
    );
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
