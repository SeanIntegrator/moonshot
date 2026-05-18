-- Track Stripe webhook delivery lifecycle so failed handlers remain retryable (Stripe retries same event id).

ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS processing_status TEXT;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE webhook_events SET processing_status = 'processed' WHERE processing_status IS NULL;

ALTER TABLE webhook_events ALTER COLUMN processing_status SET NOT NULL;
ALTER TABLE webhook_events ALTER COLUMN processing_status SET DEFAULT 'processed';

ALTER TABLE webhook_events
  ADD CONSTRAINT webhook_events_processing_status_check CHECK (
    processing_status IN ('pending', 'processing', 'processed', 'failed')
  );
