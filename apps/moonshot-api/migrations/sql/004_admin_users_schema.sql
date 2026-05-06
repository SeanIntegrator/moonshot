-- Pre-seeded café admin credentials (invite columns reserved for future onboarding email).
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES cafes (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL CONSTRAINT admin_users_password_hash_not_empty CHECK (length(trim(password_hash)) > 0),
  display_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  invite_token TEXT UNIQUE,
  invite_expires_at TIMESTAMPTZ,
  invite_accepted_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT admin_users_email_not_empty CHECK (length(trim(email)) > 0),
  UNIQUE (cafe_id, email)
);

CREATE INDEX idx_admin_users_cafe_id ON admin_users (cafe_id);

CREATE INDEX idx_admin_users_email_lower ON admin_users (lower(email));
