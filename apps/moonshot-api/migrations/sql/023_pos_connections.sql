-- POS OAuth connections (Square first). Tokens encrypted at app layer (AES-256-GCM).
CREATE TABLE pos_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES cafes (id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  merchant_id TEXT NOT NULL,
  location_id TEXT,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,
  access_token_expires_at TIMESTAMPTZ NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
  last_refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pos_connections_status_check CHECK (status IN ('active', 'needs_reauth', 'revoked'))
);

CREATE UNIQUE INDEX pos_connections_cafe_provider_unique ON pos_connections (cafe_id, provider);

CREATE UNIQUE INDEX pos_connections_provider_merchant_unique ON pos_connections (provider, merchant_id);

CREATE INDEX pos_connections_expires_at_idx ON pos_connections (access_token_expires_at)
WHERE
  status = 'active';

-- External POS modifier-list id for sync/dedupe (mirrors menu_items.pos_item_id).
ALTER TABLE modifier_groups
ADD COLUMN pos_group_id TEXT;

CREATE UNIQUE INDEX modifier_groups_cafe_pos_group_unique ON modifier_groups (cafe_id, pos_group_id)
WHERE
  pos_group_id IS NOT NULL;
