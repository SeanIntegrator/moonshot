import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

const {
  findCafeIdByMerchantId,
  findCafeIdByMerchantIdAnyStatus,
  markRevoked,
  markNeedsReauth,
  ensureFreshSquareAccessToken,
  claimWebhookForProcessing,
  completeWebhookProcessing,
  failWebhookProcessing,
  fetchSquareOrder,
  persistPosOrderEvent,
} = vi.hoisted(() => ({
  findCafeIdByMerchantId: vi.fn(),
  findCafeIdByMerchantIdAnyStatus: vi.fn(),
  markRevoked: vi.fn(),
  markNeedsReauth: vi.fn(),
  ensureFreshSquareAccessToken: vi.fn(),
  claimWebhookForProcessing: vi.fn(),
  completeWebhookProcessing: vi.fn(),
  failWebhookProcessing: vi.fn(),
  fetchSquareOrder: vi.fn(),
  persistPosOrderEvent: vi.fn(),
}));

vi.mock('../db.js', () => ({ pool: {} }));

vi.mock('../lib/pos-connections-repository.js', () => ({
  findCafeIdByMerchantId,
  findCafeIdByMerchantIdAnyStatus,
  markRevoked,
  markNeedsReauth,
}));

vi.mock('../lib/pos-adapters/square/token-refresh.js', () => ({
  ensureFreshSquareAccessToken,
}));

vi.mock('../lib/webhooks/claim.js', () => ({
  claimWebhookForProcessing,
  completeWebhookProcessing,
  failWebhookProcessing,
}));

vi.mock('../lib/pos-adapters/square/order-normalise.js', async () => {
  const actual = await vi.importActual<
    typeof import('../lib/pos-adapters/square/order-normalise.js')
  >('../lib/pos-adapters/square/order-normalise.js');
  return {
    ...actual,
    fetchSquareOrder,
  };
});

vi.mock('../lib/orders/pos-order-ingress.js', () => ({
  persistPosOrderEvent,
}));

vi.mock('../lib/pos-adapters/square/webhook.js', async () => {
  const actual = await vi.importActual<typeof import('../lib/pos-adapters/square/webhook.js')>(
    '../lib/pos-adapters/square/webhook.js',
  );
  return {
    ...actual,
    verifySquareWebhookRequest: () => true,
  };
});

import { handleSquareWebhook } from './webhooks-square.js';

function mockRes(): Response {
  const res = {
    statusCode: 200,
    status: vi.fn(function (this: Response, code: number) {
      (this as { statusCode: number }).statusCode = code;
      return this;
    }),
    json: vi.fn(function (this: Response, body: unknown) {
      (this as { body: unknown }).body = body;
      return this;
    }),
    send: vi.fn(function (this: Response, body: unknown) {
      (this as { body: unknown }).body = body;
      return this;
    }),
  } as unknown as Response & { statusCode: number; body: unknown };
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = 'test-key';
  claimWebhookForProcessing.mockResolvedValue({ kind: 'claimed' });
  completeWebhookProcessing.mockResolvedValue(undefined);
});

describe('handleSquareWebhook oauth.authorization.revoked', () => {
  it('marks the connection revoked and ACKs without order fetch', async () => {
    findCafeIdByMerchantIdAnyStatus.mockResolvedValueOnce('cafe-1');
    markRevoked.mockResolvedValueOnce(undefined);

    const body = JSON.stringify({
      merchant_id: 'MERCHANT1',
      type: 'oauth.authorization.revoked',
      event_id: 'ev-revoke-1',
      data: {
        type: 'revocation',
        object: { revocation: { revoked_at: '2020-08-14T15:51:00Z', revoker_type: 'MERCHANT' } },
      },
    });

    const req = {
      body: Buffer.from(body),
      headers: { 'x-square-hmacsha256-signature': 'sig' },
    } as unknown as Request;
    const res = mockRes();

    await handleSquareWebhook(req, res);

    expect(findCafeIdByMerchantIdAnyStatus).toHaveBeenCalledWith(
      expect.anything(),
      'square',
      'MERCHANT1',
    );
    expect(findCafeIdByMerchantId).not.toHaveBeenCalled();
    expect(markRevoked).toHaveBeenCalledWith(expect.anything(), 'cafe-1', 'square');
    expect(ensureFreshSquareAccessToken).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true, kind: 'oauth_revoked' });
  });
});

function orderCreatedBody(eventId = 'ev-order-1'): string {
  return JSON.stringify({
    merchant_id: 'MERCHANT1',
    type: 'order.created',
    event_id: eventId,
    data: {
      type: 'order_created',
      object: { order_created: { order_id: 'sq-order-1' } },
    },
  });
}

describe('handleSquareWebhook order retrieve', () => {
  beforeEach(() => {
    findCafeIdByMerchantId.mockResolvedValue('cafe-1');
    ensureFreshSquareAccessToken.mockResolvedValue({
      accessToken: 'tok',
      status: 'active',
    });
    persistPosOrderEvent.mockResolvedValue({ kind: 'created' });
  });

  it('returns 503 so Square retries when order retrieve throws', async () => {
    fetchSquareOrder.mockRejectedValueOnce(new Error('square 503'));

    const req = {
      body: Buffer.from(orderCreatedBody()),
      headers: { 'x-square-hmacsha256-signature': 'sig' },
    } as unknown as Request;
    const res = mockRes();

    await handleSquareWebhook(req, res);

    expect(persistPosOrderEvent).not.toHaveBeenCalled();
    expect(completeWebhookProcessing).not.toHaveBeenCalled();
    expect(failWebhookProcessing).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'ev-order-1',
        message: expect.stringContaining('retrieve_order_failed'),
      }),
    );
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      received: false,
      retry: true,
      reason: 'square_order_retrieve_failed',
    });
  });

  it('returns 503 so Square retries when order retrieve is empty', async () => {
    fetchSquareOrder.mockResolvedValueOnce(null);

    const req = {
      body: Buffer.from(orderCreatedBody('ev-order-empty')),
      headers: { 'x-square-hmacsha256-signature': 'sig' },
    } as unknown as Request;
    const res = mockRes();

    await handleSquareWebhook(req, res);

    expect(persistPosOrderEvent).not.toHaveBeenCalled();
    expect(completeWebhookProcessing).not.toHaveBeenCalled();
    expect(failWebhookProcessing).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'ev-order-empty',
        message: 'square_order_retrieve_empty',
      }),
    );
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      received: false,
      retry: true,
      reason: 'square_order_retrieve_failed',
    });
  });

  it('persists the retrieved order and ACKs', async () => {
    fetchSquareOrder.mockResolvedValueOnce({
      id: 'sq-order-1',
      state: 'OPEN',
      ticketName: 'Alex',
      totalMoney: { amount: 350, currency: 'GBP' },
      lineItems: [{ uid: 'li1', name: 'Latte', quantity: '1', basePriceMoney: { amount: 350 } }],
    });

    const req = {
      body: Buffer.from(orderCreatedBody('ev-order-ok')),
      headers: { 'x-square-hmacsha256-signature': 'sig' },
    } as unknown as Request;
    const res = mockRes();

    await handleSquareWebhook(req, res);

    expect(persistPosOrderEvent).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'order_open_or_updated', posOrderId: 'sq-order-1' }),
    );
    expect(completeWebhookProcessing).toHaveBeenCalled();
    expect(failWebhookProcessing).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ received: true, kind: 'order_open_or_updated' });
  });
});
