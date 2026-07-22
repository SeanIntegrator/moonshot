-- Café-scoped menu sections (Hot drinks / Cold drinks / Food / custom).
-- menu_items.category stores the section key (TEXT).

CREATE TABLE IF NOT EXISTS menu_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES cafes (id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT menu_sections_cafe_key_unique UNIQUE (cafe_id, key)
);

CREATE INDEX IF NOT EXISTS menu_sections_cafe_id_idx ON menu_sections (cafe_id);

-- Backfill system + discovered categories for every café.
WITH cafe_ids AS (
  SELECT id AS cafe_id FROM cafes
),
system_rows AS (
  SELECT
    c.cafe_id,
    v.key,
    v.label,
    v.enabled,
    TRUE AS is_system,
    v.sort_order
  FROM cafe_ids c
  CROSS JOIN (
    VALUES
      ('hot_drinks', 'Hot drinks', TRUE, 0),
      ('cold_drinks', 'Cold drinks', TRUE, 1),
      ('food', 'Food', FALSE, 2)
  ) AS v(key, label, enabled, sort_order)
),
-- Enable food when the café already has food items.
food_enabled AS (
  SELECT DISTINCT cafe_id
  FROM menu_items
  WHERE lower(category) = 'food' OR lower(category) LIKE '%food%'
),
system_upsert AS (
  SELECT
    s.cafe_id,
    s.key,
    s.label,
    CASE
      WHEN s.key = 'food' AND fe.cafe_id IS NOT NULL THEN TRUE
      ELSE s.enabled
    END AS enabled,
    s.is_system,
    s.sort_order
  FROM system_rows s
  LEFT JOIN food_enabled fe ON fe.cafe_id = s.cafe_id
),
-- Custom / extras categories already on items (not the three system keys).
discovered AS (
  SELECT
    mi.cafe_id,
    mi.category AS key,
    initcap(replace(mi.category, '_', ' ')) AS label,
    TRUE AS enabled,
    FALSE AS is_system,
    100 + ROW_NUMBER() OVER (PARTITION BY mi.cafe_id ORDER BY mi.category) AS sort_order
  FROM (
    SELECT DISTINCT cafe_id, category
    FROM menu_items
    WHERE category IS NOT NULL
      AND trim(category) <> ''
      AND category NOT IN ('hot_drinks', 'cold_drinks', 'food')
  ) mi
)
INSERT INTO menu_sections (cafe_id, key, label, enabled, is_system, sort_order)
SELECT cafe_id, key, label, enabled, is_system, sort_order FROM system_upsert
UNION ALL
SELECT cafe_id, key, label, enabled, is_system, sort_order FROM discovered
ON CONFLICT (cafe_id, key) DO NOTHING;
