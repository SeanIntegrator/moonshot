-- Cancel provenance for customer / POS / auto-expire paths.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT NULL;

ALTER TABLE orders
  DROP CONSTRAINT IF EXISTS orders_cancel_reason_check;

ALTER TABLE orders
  ADD CONSTRAINT orders_cancel_reason_check CHECK (
    cancel_reason IS NULL
    OR cancel_reason IN ('customer', 'pos', 'auto_expire')
  );
