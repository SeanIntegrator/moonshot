-- Stable POS line identity so Square webhooks upsert instead of delete-and-reinsert.
-- Backfill uses the existing UUID so the unique index can be NOT NULL immediately;
-- the next Square snapshot with a real uid will insert-then-delete those rows once.

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS pos_line_uid TEXT;

UPDATE order_items
SET pos_line_uid = id::text
WHERE pos_line_uid IS NULL;

ALTER TABLE order_items
  ALTER COLUMN pos_line_uid SET NOT NULL;

ALTER TABLE order_items
  ADD CONSTRAINT order_items_order_id_pos_line_uid_key UNIQUE (order_id, pos_line_uid);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS details_pending BOOLEAN NOT NULL DEFAULT false;
