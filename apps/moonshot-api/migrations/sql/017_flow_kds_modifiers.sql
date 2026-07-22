-- Flow KDS board: snapshot category on order lines; seed shot/bean/temp/texture
-- modifier groups; extend kds_config classification + bean accents.

ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS category TEXT;

-- ── Shots ──────────────────────────────────────────────────────────────────
INSERT INTO modifier_groups (id, cafe_id, name, selection_type, required, options, sort_order)
SELECT
  gen_random_uuid(),
  c.id,
  'Shots',
  'single',
  TRUE,
  jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid()::text, 'posOptionId', null, 'name', 'Single', 'priceMinor', 0, 'isDefault', false, 'colorHex', null, 'chipLabel', '1'),
    jsonb_build_object('id', gen_random_uuid()::text, 'posOptionId', null, 'name', 'Double', 'priceMinor', 0, 'isDefault', true, 'colorHex', null, 'chipLabel', '2'),
    jsonb_build_object('id', gen_random_uuid()::text, 'posOptionId', null, 'name', 'Triple', 'priceMinor', 0, 'isDefault', false, 'colorHex', null, 'chipLabel', '3'),
    jsonb_build_object('id', gen_random_uuid()::text, 'posOptionId', null, 'name', 'Quad', 'priceMinor', 0, 'isDefault', false, 'colorHex', null, 'chipLabel', '4')
  ),
  2
FROM cafes c
WHERE NOT EXISTS (
  SELECT 1 FROM modifier_groups mg WHERE mg.cafe_id = c.id AND mg.name = 'Shots'
);

-- ── Beans ──────────────────────────────────────────────────────────────────
INSERT INTO modifier_groups (id, cafe_id, name, selection_type, required, options, sort_order)
SELECT
  gen_random_uuid(),
  c.id,
  'Beans',
  'single',
  TRUE,
  jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid()::text, 'posOptionId', null, 'name', 'House', 'priceMinor', 0, 'isDefault', true, 'colorHex', null, 'chipLabel', 'Ho'),
    jsonb_build_object('id', gen_random_uuid()::text, 'posOptionId', null, 'name', 'Decaf', 'priceMinor', 0, 'isDefault', false, 'colorHex', null, 'chipLabel', 'Dc'),
    jsonb_build_object('id', gen_random_uuid()::text, 'posOptionId', null, 'name', 'Guest', 'priceMinor', 0, 'isDefault', false, 'colorHex', null, 'chipLabel', 'Gu')
  ),
  3
FROM cafes c
WHERE NOT EXISTS (
  SELECT 1 FROM modifier_groups mg WHERE mg.cafe_id = c.id AND mg.name = 'Beans'
);

-- ── Milk Temperature ───────────────────────────────────────────────────────
INSERT INTO modifier_groups (id, cafe_id, name, selection_type, required, options, sort_order)
SELECT
  gen_random_uuid(),
  c.id,
  'Milk Temperature',
  'single',
  TRUE,
  jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid()::text, 'posOptionId', null, 'name', 'Hot', 'priceMinor', 0, 'isDefault', true, 'colorHex', null, 'chipLabel', 'Hot'),
    jsonb_build_object('id', gen_random_uuid()::text, 'posOptionId', null, 'name', 'Warm', 'priceMinor', 0, 'isDefault', false, 'colorHex', null, 'chipLabel', 'Warm'),
    jsonb_build_object('id', gen_random_uuid()::text, 'posOptionId', null, 'name', 'Extra Hot', 'priceMinor', 0, 'isDefault', false, 'colorHex', null, 'chipLabel', 'XH'),
    jsonb_build_object('id', gen_random_uuid()::text, 'posOptionId', null, 'name', 'Extra Extra Hot', 'priceMinor', 0, 'isDefault', false, 'colorHex', null, 'chipLabel', 'XXH')
  ),
  4
FROM cafes c
WHERE NOT EXISTS (
  SELECT 1 FROM modifier_groups mg WHERE mg.cafe_id = c.id AND mg.name = 'Milk Temperature'
);

-- ── Milk Texture ───────────────────────────────────────────────────────────
INSERT INTO modifier_groups (id, cafe_id, name, selection_type, required, options, sort_order)
SELECT
  gen_random_uuid(),
  c.id,
  'Milk Texture',
  'single',
  TRUE,
  jsonb_build_array(
    jsonb_build_object('id', gen_random_uuid()::text, 'posOptionId', null, 'name', 'Standard', 'priceMinor', 0, 'isDefault', true, 'colorHex', null, 'chipLabel', 'Std'),
    jsonb_build_object('id', gen_random_uuid()::text, 'posOptionId', null, 'name', 'Wet', 'priceMinor', 0, 'isDefault', false, 'colorHex', null, 'chipLabel', 'Wet'),
    jsonb_build_object('id', gen_random_uuid()::text, 'posOptionId', null, 'name', 'Dry', 'priceMinor', 0, 'isDefault', false, 'colorHex', null, 'chipLabel', 'Dry'),
    jsonb_build_object('id', gen_random_uuid()::text, 'posOptionId', null, 'name', 'Extra Foam', 'priceMinor', 0, 'isDefault', false, 'colorHex', null, 'chipLabel', 'EF')
  ),
  5
FROM cafes c
WHERE NOT EXISTS (
  SELECT 1 FROM modifier_groups mg WHERE mg.cafe_id = c.id AND mg.name = 'Milk Texture'
);

-- Attach new groups to non-food menu items (idempotent).
INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order)
SELECT mi.id, mg.id, 10
FROM menu_items mi
JOIN modifier_groups mg ON mg.cafe_id = mi.cafe_id AND mg.name = 'Shots'
WHERE mi.category IS DISTINCT FROM 'food'
ON CONFLICT DO NOTHING;

INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order)
SELECT mi.id, mg.id, 11
FROM menu_items mi
JOIN modifier_groups mg ON mg.cafe_id = mi.cafe_id AND mg.name = 'Beans'
WHERE mi.category IS DISTINCT FROM 'food'
ON CONFLICT DO NOTHING;

INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order)
SELECT mi.id, mg.id, 12
FROM menu_items mi
JOIN modifier_groups mg ON mg.cafe_id = mi.cafe_id AND mg.name = 'Milk Temperature'
WHERE mi.category IS DISTINCT FROM 'food'
ON CONFLICT DO NOTHING;

INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order)
SELECT mi.id, mg.id, 13
FROM menu_items mi
JOIN modifier_groups mg ON mg.cafe_id = mi.cafe_id AND mg.name = 'Milk Texture'
WHERE mi.category IS DISTINCT FROM 'food'
ON CONFLICT DO NOTHING;

-- Extend kds_config classification roles + bean accents for existing cafés.
UPDATE cafes
SET kds_config =
  jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                kds_config,
                '{modifierClassification,shots}',
                '["Shots"]'::jsonb,
                TRUE
              ),
              '{modifierClassification,beans}',
              '["Beans"]'::jsonb,
              TRUE
            ),
            '{modifierClassification,milkTemperature}',
            '["Milk Temperature"]'::jsonb,
            TRUE
          ),
          '{modifierClassification,milkTexture}',
          '["Milk Texture"]'::jsonb,
          TRUE
        ),
        '{beanBadges,house,accent}',
        '"#e8a33d"'::jsonb,
        TRUE
      ),
      '{beanBadges,decaf,accent}',
      '"#7aa2d6"'::jsonb,
      TRUE
    ),
    '{beanBadges,guest,accent}',
    '"#7fb069"'::jsonb,
    TRUE
  );
