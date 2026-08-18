-- Pause, last-order buffer, and one-off date overrides.
-- Weekly hours stay on cafes.hours; a calendar date cannot hang on that weekday map.

ALTER TABLE cafes
  ADD COLUMN IF NOT EXISTS paused_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_order_buffer_minutes INTEGER NOT NULL DEFAULT 20;

ALTER TABLE cafes
  DROP CONSTRAINT IF EXISTS cafes_last_order_buffer_minutes_chk;

ALTER TABLE cafes
  ADD CONSTRAINT cafes_last_order_buffer_minutes_chk
  CHECK (last_order_buffer_minutes IN (0, 10, 15, 20, 30, 45, 60));

CREATE TABLE IF NOT EXISTS cafe_hours_overrides (
  cafe_id UUID NOT NULL REFERENCES cafes (id) ON DELETE CASCADE,
  override_date DATE NOT NULL,
  label TEXT,
  closed BOOLEAN NOT NULL DEFAULT FALSE,
  intervals JSONB NOT NULL DEFAULT '[]'::jsonb,
  PRIMARY KEY (cafe_id, override_date),
  CONSTRAINT cafe_hours_overrides_shape_chk CHECK (
    (closed AND intervals = '[]'::jsonb)
    OR (
      NOT closed
      AND jsonb_typeof(intervals) = 'array'
      AND jsonb_array_length(intervals) > 0
    )
  )
);

CREATE INDEX IF NOT EXISTS cafe_hours_overrides_cafe_idx
  ON cafe_hours_overrides (cafe_id);
