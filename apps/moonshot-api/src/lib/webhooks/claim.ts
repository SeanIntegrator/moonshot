import type { Pool, PoolClient } from 'pg';

export type WebhookClaimResult =
  | { kind: 'process' }
  | { kind: 'duplicate_processed' }
  | { kind: 'skip_inflight' };

/**
 * Provider-agnostic claim on `webhook_events` (Stripe, Square, …).
 * Same event_id may be retried; only `processed` is a permanent ACK.
 */
export async function claimWebhookForProcessing(params: {
  client: Pool | PoolClient;
  provider: string;
  eventId: string;
  cafeId: string | null;
}): Promise<WebhookClaimResult> {
  const { client, provider, eventId, cafeId } = params;

  await client.query(
    `UPDATE webhook_events
     SET processing_status = 'failed',
         last_error = 'stale_processing_reclaimed',
         updated_at = NOW()
     WHERE provider = $1
       AND event_id = $2
       AND processing_status = 'processing'
       AND updated_at < NOW() - INTERVAL '15 minutes'`,
    [provider, eventId],
  );

  await client.query(
    `INSERT INTO webhook_events (provider, event_id, cafe_id, processing_status)
     VALUES ($1, $2, $3, 'pending')
     ON CONFLICT (provider, event_id) DO NOTHING`,
    [provider, eventId, cafeId],
  );

  const claimed = await client.query<{ id: string }>(
    `UPDATE webhook_events
     SET processing_status = 'processing',
         updated_at = NOW(),
         last_error = NULL,
         cafe_id = COALESCE($3, cafe_id)
     WHERE provider = $1
       AND event_id = $2
       AND processing_status IN ('pending', 'failed')
     RETURNING id`,
    [provider, eventId, cafeId],
  );

  if (claimed.rows.length > 0) {
    return { kind: 'process' };
  }

  const row = await client.query<{ processing_status: string }>(
    `SELECT processing_status FROM webhook_events WHERE provider = $1 AND event_id = $2`,
    [provider, eventId],
  );

  const status = row.rows[0]?.processing_status;
  if (status === 'processed') {
    return { kind: 'duplicate_processed' };
  }

  return { kind: 'skip_inflight' };
}

export async function completeWebhookProcessing(params: {
  client: Pool | PoolClient;
  provider: string;
  eventId: string;
}): Promise<void> {
  await params.client.query(
    `UPDATE webhook_events
     SET processing_status = 'processed',
         processed_at = NOW(),
         updated_at = NOW(),
         last_error = NULL
     WHERE provider = $1 AND event_id = $2`,
    [params.provider, params.eventId],
  );
}

export async function failWebhookProcessing(params: {
  client: Pool | PoolClient;
  provider: string;
  eventId: string;
  message: string;
}): Promise<void> {
  const msg = params.message.slice(0, 2000);
  await params.client.query(
    `UPDATE webhook_events
     SET processing_status = 'failed',
         last_error = $3,
         updated_at = NOW()
     WHERE provider = $1 AND event_id = $2`,
    [params.provider, params.eventId, msg],
  );
}
