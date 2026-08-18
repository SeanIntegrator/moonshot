-- Option 86 state lives off the JSONB options array so Square catalog sync
-- cannot restore stock mid-service. Absence of a row means in stock.
CREATE TABLE modifier_option_availability (
  cafe_id   UUID NOT NULL REFERENCES cafes (id) ON DELETE CASCADE,
  option_id UUID NOT NULL,
  out_until TIMESTAMPTZ,
  set_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cafe_id, option_id)
);

CREATE INDEX modifier_option_availability_cafe_idx
  ON modifier_option_availability (cafe_id);
