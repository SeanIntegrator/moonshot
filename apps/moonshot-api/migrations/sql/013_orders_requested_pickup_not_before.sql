-- Customer-requested earliest pickup (from pickupDelayMinutes at order create).
-- Live FIFO ETA uses max(fifo, requested_pickup_not_before).

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS requested_pickup_not_before TIMESTAMPTZ;
