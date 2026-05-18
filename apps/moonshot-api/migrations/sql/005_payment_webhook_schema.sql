-- Payment sessions + webhook idempotency (provider-agnostic keys)
-- See docs/schema-draft.md

CREATE TABLE payment_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  cafe_id UUID NOT NULL REFERENCES cafes (id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  session_id TEXT NOT NULL,
  payment_intent_id TEXT,
  amount_minor INTEGER NOT NULL,
  currency TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'initial',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_sessions_amount_nonneg CHECK (amount_minor >= 0)
);

CREATE UNIQUE INDEX payment_sessions_session_id_unique ON payment_sessions (session_id);

CREATE INDEX idx_payment_sessions_order_id ON payment_sessions (order_id);

CREATE INDEX idx_payment_sessions_cafe_id ON payment_sessions (cafe_id);

CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  cafe_id UUID REFERENCES cafes (id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, event_id)
);

CREATE INDEX idx_webhook_events_cafe_id ON webhook_events (cafe_id);
