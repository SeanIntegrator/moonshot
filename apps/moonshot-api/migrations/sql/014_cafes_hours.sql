-- Café weekly opening hours (local wall-clock in cafes.timezone).
-- Shape: { mon: [{ open: "HH:mm", close: "HH:mm" }], … }. Empty day = closed.

ALTER TABLE cafes
  ADD COLUMN IF NOT EXISTS hours JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Seed weekday hours for cafés that still have the empty default (dev + existing).
UPDATE cafes
SET
  hours = '{
    "mon": [{"open": "08:00", "close": "16:00"}],
    "tue": [{"open": "08:00", "close": "16:00"}],
    "wed": [{"open": "08:00", "close": "16:00"}],
    "thu": [{"open": "08:00", "close": "16:00"}],
    "fri": [{"open": "08:00", "close": "16:00"}],
    "sat": [{"open": "08:00", "close": "16:00"}],
    "sun": []
  }'::jsonb
WHERE
  hours = '{}'::jsonb
  OR hours IS NULL;
