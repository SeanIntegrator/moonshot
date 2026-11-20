import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';

const {
  findCafeIdByMerchantId,
  findCafeIdByMerchantIdAnyStatus,
  getPosConnection,
  markRevoked,
  markNeedsReauth,
  ensureFreshSquareAccessToken,
  claimWebhookForProcessing,
  completeWebhookProcessing,
  failWebhookProcessing,
} = vi.hoisted(() => ({
  findCafeIdByMerchantId: vi.fn(),
  findCafeIdByMerchantIdAnyStatus: vi.fn(),
  getPosConnection: vi.fn(),
  markRevoked: vi.fn(),
  markNeedsReauth: vi.fn(),
  ensureFreshSquareAccessToken: vi.fn(),
  claimWebhookForProcessing: vi.fn(),
  completeWebhookProcessing: vi.fn(),
  failWebhookProcessing: vi.fn(),
}));

vi.mock('../db.js', () => ({ pool: {} }));

vi.mock('../lib/pos-connections-repository.js', () => ({
  findCafeIdByMerchantId,
  findCafeIdByMerchantIdAnyStatus,
  getPosConnection,
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

vi.mock('../lib/pos-adapters/square/webhook.js', async () => {
  const actual = await vi.importActual<typeof import('../lib/pos-adapters/square/webhook.js')>(
    '../lib/pos-adapters/square/webhook.js'
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
      'MERCHANT1'
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

describe('handleSquareWebhook inactive connection', () => {
  it('returns 503 so Square retries when the merchant is known but needs_reauth', async () => {
    findCafeIdByMerchantId.mockResolvedValueOnce(null);
    findCafeIdByMerchantIdAnyStatus.mockResolvedValueOnce('cafe-1');
    getPosConnection.mockResolvedValueOnce({ status: 'needs_reauth' });

    const req = {
      body: Buffer.from(orderCreatedBody('ev-reauth-1')),
      headers: { 'x-square-hmacsha256-signature': 'sig' },
    } as unknown as Request;
    const res = mockRes();

    await handleSquareWebhook(req, res);

    expect(completeWebhookProcessing).not.toHaveBeenCalled();
    expect(ensureFreshSquareAccessToken).not.toHaveBeenCalled();
    expect(failWebhookProcessing).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'ev-reauth-1',
        message: 'square_connection_not_active:needs_reauth',
      })
    );
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      received: false,
      retry: true,
      reason: 'square_connection_not_active',
    });
  });

  it('ACKs truly unknown merchants so Square does not retry forever', async () => {
    findCafeIdByMerchantId.mockResolvedValueOnce(null);
    findCafeIdByMerchantIdAnyStatus.mockResolvedValueOnce(null);

    const req = {
      body: Buffer.from(orderCreatedBody('ev-unknown-1')),
      headers: { 'x-square-hmacsha256-signature': 'sig' },
    } as unknown as Request;
    const res = mockRes();

    await handleSquareWebhook(req, res);

    expect(getPosConnection).not.toHaveBeenCalled();
    expect(failWebhookProcessing).not.toHaveBeenCalled();
    expect(completeWebhookProcessing).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      received: true,
      ignored: true,
      reason: 'unknown_merchant',
    });
  });

  it('ACKs revoked merchants (no reconnect expected) as unknown', async () => {
    findCafeIdByMerchantId.mockResolvedValueOnce(null);
    findCafeIdByMerchantIdAnyStatus.mockResolvedValueOnce('cafe-1');
    // getPosConnection excludes revoked rows.
    getPosConnection.mockResolvedValueOnce(null);

    const req = {
      body: Buffer.from(orderCreatedBody('ev-revoked-1')),
      headers: { 'x-square-hmacsha256-signature': 'sig' },
    } as unknown as Request;
    const res = mockRes();

    await handleSquareWebhook(req, res);

    expect(failWebhookProcessing).not.toHaveBeenCalled();
    expect(completeWebhookProcessing).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      received: true,
      ignored: true,
      reason: 'unknown_merchant',
    });
  });
});
