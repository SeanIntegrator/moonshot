-- Phase 3 — café-scoped KDS device/user credentials
-- See docs plan: KDS auth before public KDS HTTP/socket surfaces.

CREATE TABLE kds_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES cafes (id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  password_hash TEXT NOT NULL CONSTRAINT kds_users_password_hash_not_empty CHECK (length(trim(password_hash)) > 0),
  display_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT kds_users_username_not_empty CHECK (length(trim(username)) > 0)
);

CREATE UNIQUE INDEX kds_users_cafe_username_unique ON kds_users (cafe_id, username);

CREATE INDEX idx_kds_users_cafe_id ON kds_users (cafe_id);
