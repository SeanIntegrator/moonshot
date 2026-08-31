-- When an order (re)enters the KDS board. Fresh on place; reset on recall so
-- the 16h open-board / auto-expire window does not use original place time.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS board_opened_at TIMESTAMPTZ;

UPDATE orders
SET board_opened_at = created_at
WHERE board_opened_at IS NULL;

ALTER TABLE orders
  ALTER COLUMN board_opened_at SET DEFAULT NOW(),
  ALTER COLUMN board_opened_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_cafe_status_board_opened
  ON orders (cafe_id, status, board_opened_at DESC);
