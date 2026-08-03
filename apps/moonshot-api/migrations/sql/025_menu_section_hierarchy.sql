-- Menu section hierarchy + POS category ids + food/drink kind.
-- Enables mirroring Square (and future Lightspeed) category trees.

ALTER TABLE menu_sections
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES menu_sections (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pos_category_id TEXT,
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'drink';

ALTER TABLE menu_sections
  DROP CONSTRAINT IF EXISTS menu_sections_kind_check;

ALTER TABLE menu_sections
  ADD CONSTRAINT menu_sections_kind_check CHECK (kind IN ('drink', 'food'));

-- One POS category id per café (NULL allowed for Moonshot-only sections).
CREATE UNIQUE INDEX IF NOT EXISTS menu_sections_cafe_pos_category_id_uidx
  ON menu_sections (cafe_id, pos_category_id)
  WHERE pos_category_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS menu_sections_parent_id_idx ON menu_sections (parent_id);

-- Backfill food kind for the legacy system food section + name heuristics.
UPDATE menu_sections
SET kind = 'food', updated_at = NOW()
WHERE key = 'food'
   OR lower(label) LIKE '%food%'
   OR lower(label) LIKE '%pastr%'
   OR lower(label) LIKE '%bakery%'
   OR lower(label) LIKE '%snack%'
   OR lower(label) LIKE '%cake%'
   OR lower(label) LIKE '%sandwich%';

-- Seed kds_config.foodSectionKeys from sections with kind = food.
UPDATE cafes c
SET kds_config = jsonb_set(
  COALESCE(c.kds_config, '{}'::jsonb),
  '{foodSectionKeys}',
  COALESCE(
    (
      SELECT jsonb_agg(ms.key ORDER BY ms.sort_order, ms.label)
      FROM menu_sections ms
      WHERE ms.cafe_id = c.id AND ms.kind = 'food'
    ),
    '["food"]'::jsonb
  ),
  true
);
