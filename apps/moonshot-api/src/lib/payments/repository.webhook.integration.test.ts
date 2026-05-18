import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  claimStripeWebhookForProcessing,
  completeStripeWebhookProcessing,
  failStripeWebhookProcessing,
} from './repository.js';

const connectionString = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

describe.skipIf(!connectionString)('stripe webhook_events lifecycle (integration)', () => {
  let client: pg.Client;

  beforeAll(async () => {
    client = new pg.Client({ connectionString });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  beforeEach(async () => {
    await client.query('BEGIN');
  });

  afterEach(async () => {
    await client.query('ROLLBACK');
  });

  function evt(): string {
    return `evt_${randomUUID().replace(/-/g, '')}`;
  }

  it('first delivery claims row as processing', async () => {
    const eventId = evt();
    const claim = await claimStripeWebhookForProcessing({ client, eventId, cafeId: null });
    expect(claim.kind).toBe('process');

    const { rows } = await client.query<{ processing_status: string }>(
      `SELECT processing_status FROM webhook_events WHERE provider = 'stripe' AND event_id = $1`,
      [eventId],
    );
    expect(rows[0]?.processing_status).toBe('processing');
  });

  it('marks processed on complete; duplicate delivery is duplicate_processed', async () => {
    const eventId = evt();
    expect((await claimStripeWebhookForProcessing({ client, eventId, cafeId: null })).kind).toBe(
      'process',
    );
    await completeStripeWebhookProcessing({ client, eventId });

    expect((await claimStripeWebhookForProcessing({ client, eventId, cafeId: null })).kind).toBe(
      'duplicate_processed',
    );

    const { rows } = await client.query<{ processing_status: string }>(
      `SELECT processing_status FROM webhook_events WHERE provider = 'stripe' AND event_id = $1`,
      [eventId],
    );
    expect(rows[0]?.processing_status).toBe('processed');
  });

  it('failed handling becomes failed then retries reclaim as process', async () => {
    const eventId = evt();
    expect((await claimStripeWebhookForProcessing({ client, eventId, cafeId: null })).kind).toBe(
      'process',
    );
    await failStripeWebhookProcessing({ client, eventId, message: 'simulated handler failure' });

    expect((await claimStripeWebhookForProcessing({ client, eventId, cafeId: null })).kind).toBe(
      'process',
    );

    const { rows } = await client.query<{ processing_status: string; last_error: string | null }>(
      `SELECT processing_status, last_error FROM webhook_events WHERE provider = 'stripe' AND event_id = $1`,
      [eventId],
    );
    expect(rows[0]?.processing_status).toBe('processing');
    expect(rows[0]?.last_error).toBeNull();
  });

  it('concurrent delivery skips while row stays processing', async () => {
    const eventId = evt();
    const first = await claimStripeWebhookForProcessing({ client, eventId, cafeId: null });
    expect(first.kind).toBe('process');

    const second = await claimStripeWebhookForProcessing({ client, eventId, cafeId: null });
    expect(second.kind).toBe('skip_inflight');

    await completeStripeWebhookProcessing({ client, eventId });
    expect((await claimStripeWebhookForProcessing({ client, eventId, cafeId: null })).kind).toBe(
      'duplicate_processed',
    );
  });

  it('reclaims stale processing after 15 minutes so Stripe retries can proceed', async () => {
    const eventId = evt();
    expect((await claimStripeWebhookForProcessing({ client, eventId, cafeId: null })).kind).toBe(
      'process',
    );

    await client.query(
      `UPDATE webhook_events
       SET updated_at = NOW() - INTERVAL '20 minutes'
       WHERE provider = 'stripe' AND event_id = $1`,
      [eventId],
    );

    const retry = await claimStripeWebhookForProcessing({ client, eventId, cafeId: null });
    expect(retry.kind).toBe('process');

    const { rows } = await client.query<{ processing_status: string }>(
      `SELECT processing_status FROM webhook_events WHERE provider = 'stripe' AND event_id = $1`,
      [eventId],
    );
    expect(rows[0]?.processing_status).toBe('processing');
  });
});
