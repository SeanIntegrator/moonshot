import type { Pool, PoolClient } from 'pg';

export async function insertPaymentSession(params: {
  client: Pool | PoolClient;
  orderId: string;
  cafeId: string;
  provider: string;
  sessionId: string;
  paymentIntentId: string | null;
  amountMinor: number;
  currency: string;
  type?: string;
}): Promise<void> {
  const {
    client,
    orderId,
    cafeId,
    provider,
    sessionId,
    paymentIntentId,
    amountMinor,
    currency,
    type = 'initial',
  } = params;
  await client.query(
    `INSERT INTO payment_sessions (
      order_id, cafe_id, provider, session_id, payment_intent_id, amount_minor, currency, type
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [orderId, cafeId, provider, sessionId, paymentIntentId, amountMinor, currency, type],
  );
}

export type StripeWebhookClaimResult =
  | { kind: 'process' }
  /** Same event already finished successfully — safe to ACK Stripe */
  | { kind: 'duplicate_processed' }
  /** Concurrent delivery or stuck row — ACK Stripe without double-processing */
  | { kind: 'skip_inflight' };

/**
 * Stripe may retry the same `event.id`. We only mark `processed` after successful handling.
 * Failed attempts set `failed` so retries can claim again. Stale `processing` rows are reclaimed.
 */
export async function claimStripeWebhookForProcessing(params: {
  client: Pool | PoolClient;
  eventId: string;
  cafeId: string | null;
}): Promise<StripeWebhookClaimResult> {
  const { client, eventId, cafeId } = params;

  await client.query(
    `UPDATE webhook_events
     SET processing_status = 'failed',
         last_error = 'stale_processing_reclaimed',
         updated_at = NOW()
     WHERE provider = 'stripe'
       AND event_id = $1
       AND processing_status = 'processing'
       AND updated_at < NOW() - INTERVAL '15 minutes'`,
    [eventId],
  );

  await client.query(
    `INSERT INTO webhook_events (provider, event_id, cafe_id, processing_status)
     VALUES ('stripe', $1, $2, 'pending')
     ON CONFLICT (provider, event_id) DO NOTHING`,
    [eventId, cafeId],
  );

  const claimed = await client.query<{ id: string }>(
    `UPDATE webhook_events
     SET processing_status = 'processing',
         updated_at = NOW(),
         last_error = NULL
     WHERE provider = 'stripe'
       AND event_id = $1
       AND processing_status IN ('pending', 'failed')
     RETURNING id`,
    [eventId],
  );

  if (claimed.rows.length > 0) {
    return { kind: 'process' };
  }

  const row = await client.query<{ processing_status: string }>(
    `SELECT processing_status FROM webhook_events WHERE provider = 'stripe' AND event_id = $1`,
    [eventId],
  );

  const status = row.rows[0]?.processing_status;
  if (status === 'processed') {
    return { kind: 'duplicate_processed' };
  }

  return { kind: 'skip_inflight' };
}

export async function completeStripeWebhookProcessing(params: {
  client: Pool | PoolClient;
  eventId: string;
}): Promise<void> {
  await params.client.query(
    `UPDATE webhook_events
     SET processing_status = 'processed',
         processed_at = NOW(),
         updated_at = NOW(),
         last_error = NULL
     WHERE provider = 'stripe' AND event_id = $1`,
    [params.eventId],
  );
}

export async function failStripeWebhookProcessing(params: {
  client: Pool | PoolClient;
  eventId: string;
  message: string;
}): Promise<void> {
  const msg = params.message.slice(0, 2000);
  await params.client.query(
    `UPDATE webhook_events
     SET processing_status = 'failed',
         last_error = $2,
         updated_at = NOW()
     WHERE provider = 'stripe' AND event_id = $1`,
    [params.eventId, msg],
  );
}

export async function updateCafePaymentConfig(params: {
  client: Pool | PoolClient;
  cafeId: string;
  paymentConfig: Record<string, unknown>;
}): Promise<void> {
  const { client, cafeId, paymentConfig } = params;
  await client.query(`UPDATE cafes SET payment_config = $1::jsonb WHERE id = $2`, [
    JSON.stringify(paymentConfig),
    cafeId,
  ]);
}
