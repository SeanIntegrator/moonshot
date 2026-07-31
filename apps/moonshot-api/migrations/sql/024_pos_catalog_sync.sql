-- Catalog sync cursor + status on pos_connections (Square → Moonshot menu sync).

ALTER TABLE pos_connections
  ADD COLUMN IF NOT EXISTS catalog_sync_cursor TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS catalog_last_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS catalog_sync_status TEXT NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS catalog_sync_error TEXT;

ALTER TABLE pos_connections DROP CONSTRAINT IF EXISTS pos_connections_catalog_sync_status_check;

ALTER TABLE pos_connections
  ADD CONSTRAINT pos_connections_catalog_sync_status_check
  CHECK (catalog_sync_status IN ('idle', 'syncing', 'error'));
