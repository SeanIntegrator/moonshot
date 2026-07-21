-- Persist barista ETA override so FIFO recompute does not clobber stretched pickup times.
-- Values: 'auto' | 'manual_override' (matches packages/types EtaMode).

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS eta_mode TEXT NOT NULL DEFAULT 'auto';

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_eta_mode_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_eta_mode_check CHECK (eta_mode IN ('auto', 'manual_override'));
