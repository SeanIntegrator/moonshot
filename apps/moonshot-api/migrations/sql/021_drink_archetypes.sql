-- Drink archetypes: café recipes, per-item archetype + milk surcharge waive,
-- Ice Level / Toppings library groups, and backfill attachments by drink name.

ALTER TABLE cafes
  ADD COLUMN IF NOT EXISTS drink_archetype_config JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS archetype TEXT NULL;

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS waive_milk_surcharge BOOLEAN NOT NULL DEFAULT FALSE;

-- Platform default recipes for every café (full snapshot so admin can edit).
UPDATE cafes
SET drink_archetype_config = '{
  "espresso-neat": {"slots": ["shots", "beans"], "milkCharge": "none"},
  "low-milk-hot": {"slots": ["milk", "shots", "beans"], "milkCharge": "waived"},
  "milk-forward-hot": {"slots": ["milk", "syrup", "shots", "milk_temperature", "milk_texture", "beans"], "milkCharge": "standard"},
  "non-coffee-milk-hot": {"slots": ["milk", "syrup", "milk_temperature", "toppings"], "milkCharge": "standard"},
  "tea": {"slots": ["milk"], "milkCharge": "waived"},
  "low-milk-iced": {"slots": ["milk", "shots", "ice_level"], "milkCharge": "waived"},
  "milk-forward-iced": {"slots": ["milk", "syrup", "shots", "ice_level", "beans"], "milkCharge": "standard"},
  "non-coffee-milk-iced": {"slots": ["milk", "syrup", "ice_level", "toppings"], "milkCharge": "standard"}
}'::jsonb
WHERE drink_archetype_config = '{}'::jsonb
   OR drink_archetype_config IS NULL
   OR drink_archetype_config = 'null'::jsonb;

-- ── Ice Level ──────────────────────────────────────────────────────────────
INSERT INTO modifier_groups (id, cafe_id, name, selection_type, required, options, sort_order)
SELECT
  gen_random_uuid(),
  c.id,
  'Ice Level',
  'single',
  TRUE,
  jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid()::text, 'posOptionId', null, 'name', 'Light', 'priceMinor', 0, 'isDefault', false, 'colorHex', null, 'chipLabel', 'Lt'),
    jsonb_build_object('id', gen_random_uuid()::text, 'posOptionId', null, 'name', 'Regular', 'priceMinor', 0, 'isDefault', true, 'colorHex', null, 'chipLabel', 'Reg'),
    jsonb_build_object('id', gen_random_uuid()::text, 'posOptionId', null, 'name', 'Extra', 'priceMinor', 0, 'isDefault', false, 'colorHex', null, 'chipLabel', 'Ex')
  ),
  6
FROM cafes c
WHERE NOT EXISTS (
  SELECT 1 FROM modifier_groups mg WHERE mg.cafe_id = c.id AND mg.name = 'Ice Level'
);

-- ── Toppings ───────────────────────────────────────────────────────────────
INSERT INTO modifier_groups (id, cafe_id, name, selection_type, required, max_select, options, sort_order)
SELECT
  gen_random_uuid(),
  c.id,
  'Toppings',
  'multi',
  FALSE,
  NULL,
  jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid()::text, 'posOptionId', null, 'name', 'Marshmallows', 'priceMinor', 0, 'isDefault', false, 'colorHex', null, 'chipLabel', 'Mm'),
    jsonb_build_object('id', gen_random_uuid()::text, 'posOptionId', null, 'name', 'Whipped cream', 'priceMinor', 0, 'isDefault', false, 'colorHex', null, 'chipLabel', 'Wh')
  ),
  7
FROM cafes c
WHERE NOT EXISTS (
  SELECT 1 FROM modifier_groups mg WHERE mg.cafe_id = c.id AND mg.name = 'Toppings'
);

-- Infer archetype from normalised display name (longer / iced matches first via CASE order).
WITH normalised AS (
  SELECT
    id,
    lower(trim(both FROM regexp_replace(name, '[^a-zA-Z0-9]+', ' ', 'g'))) AS n
  FROM menu_items
  WHERE category IS DISTINCT FROM 'food'
    AND archetype IS NULL
)
UPDATE menu_items mi
SET archetype = CASE
  WHEN n.n IN ('espresso') THEN 'espresso-neat'
  WHEN n.n IN ('iced americano') THEN 'low-milk-iced'
  WHEN n.n IN ('iced latte', 'iced mocha', 'iced flat white') THEN 'milk-forward-iced'
  WHEN n.n IN (
    'iced chocolate',
    'iced matcha latte',
    'iced matcha',
    'iced chai',
    'iced chai latte'
  ) THEN 'non-coffee-milk-iced'
  WHEN n.n IN ('americano', 'macchiato', 'cortado') THEN 'low-milk-hot'
  WHEN n.n IN ('flat white', 'latte', 'cappuccino', 'mocha') THEN 'milk-forward-hot'
  WHEN n.n IN ('hot chocolate', 'chai latte', 'matcha latte') THEN 'non-coffee-milk-hot'
  WHEN n.n IN ('breakfast tea', 'tea') THEN 'tea'
  ELSE NULL
END
FROM normalised n
WHERE mi.id = n.id;

UPDATE menu_items
SET waive_milk_surcharge = TRUE
WHERE archetype IN ('low-milk-hot', 'tea', 'low-milk-iced');

UPDATE menu_items
SET waive_milk_surcharge = FALSE
WHERE archetype IS NOT NULL
  AND archetype NOT IN ('low-milk-hot', 'tea', 'low-milk-iced');

-- Replace modifier attachments for items that received an archetype.
DELETE FROM menu_item_modifier_groups mimg
USING menu_items mi
WHERE mimg.menu_item_id = mi.id
  AND mi.archetype IS NOT NULL;

INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order)
SELECT mi.id, mg.id, slot.sort_order
FROM menu_items mi
JOIN (
  VALUES
    ('espresso-neat', 'Shots', 2),
    ('espresso-neat', 'Beans', 3),
    ('low-milk-hot', 'Milks', 0),
    ('low-milk-hot', 'Shots', 2),
    ('low-milk-hot', 'Beans', 3),
    ('milk-forward-hot', 'Milks', 0),
    ('milk-forward-hot', 'Syrups', 1),
    ('milk-forward-hot', 'Shots', 2),
    ('milk-forward-hot', 'Beans', 3),
    ('milk-forward-hot', 'Milk Temperature', 4),
    ('milk-forward-hot', 'Milk Texture', 5),
    ('non-coffee-milk-hot', 'Milks', 0),
    ('non-coffee-milk-hot', 'Syrups', 1),
    ('non-coffee-milk-hot', 'Milk Temperature', 4),
    ('non-coffee-milk-hot', 'Toppings', 7),
    ('tea', 'Milks', 0),
    ('low-milk-iced', 'Milks', 0),
    ('low-milk-iced', 'Shots', 2),
    ('low-milk-iced', 'Ice Level', 6),
    ('milk-forward-iced', 'Milks', 0),
    ('milk-forward-iced', 'Syrups', 1),
    ('milk-forward-iced', 'Shots', 2),
    ('milk-forward-iced', 'Beans', 3),
    ('milk-forward-iced', 'Ice Level', 6),
    ('non-coffee-milk-iced', 'Milks', 0),
    ('non-coffee-milk-iced', 'Syrups', 1),
    ('non-coffee-milk-iced', 'Ice Level', 6),
    ('non-coffee-milk-iced', 'Toppings', 7)
) AS slot(archetype, group_name, sort_order)
  ON slot.archetype = mi.archetype
JOIN modifier_groups mg
  ON mg.cafe_id = mi.cafe_id
 AND mg.name = slot.group_name
WHERE mi.archetype IS NOT NULL
ON CONFLICT DO NOTHING;

-- KDS classification: treat Ice Level like prep sliders; Toppings as additions.
UPDATE cafes
SET kds_config =
  jsonb_set(
    jsonb_set(
      kds_config,
      '{modifierClassification,iceLevel}',
      '["Ice Level"]'::jsonb,
      TRUE
    ),
    '{modifierClassification,additions}',
    COALESCE(kds_config->'modifierClassification'->'additions', '[]'::jsonb) || '["Toppings"]'::jsonb,
    TRUE
  );
