-- Phase 8 — enable loyalty on seed café + richer manual menu (dev-friendly)

UPDATE cafes
SET
  features = jsonb_set(
    COALESCE(features, '{}'::jsonb),
    '{loyalty}',
    '{"enabled": true, "stampsPerReward": 10, "rewardDescription": "Free drink", "doubleStampDays": []}'::jsonb,
    TRUE
  )
WHERE
  slug = 'clay-and-bean';

UPDATE menu_items mi
SET
  subcategory = 'espresso',
  description = 'Double shot, steamed milk — silky microfoam.',
  modifier_groups =
    $$
[
  {
    "id": "11111111-1111-4111-8111-111111111101",
    "name": "Milk",
    "selectionType": "single",
    "required": false,
    "options": [
      {"id": "22222222-2222-4222-8222-222222222201", "posOptionId": null, "name": "Whole · cow", "priceMinor": 0, "isDefault": true},
      {"id": "22222222-2222-4222-8222-222222222202", "posOptionId": null, "name": "Oat", "priceMinor": 30, "isDefault": false},
      {"id": "22222222-2222-4222-8222-222222222203", "posOptionId": null, "name": "Soy", "priceMinor": 30, "isDefault": false},
      {"id": "22222222-2222-4222-8222-222222222204", "posOptionId": null, "name": "Skim", "priceMinor": 0, "isDefault": false},
      {"id": "22222222-2222-4222-8222-222222222205", "posOptionId": null, "name": "No milk", "priceMinor": 0, "isDefault": false}
    ]
  },
  {
    "id": "11111111-1111-4111-8111-111111111102",
    "name": "Temperature",
    "selectionType": "single",
    "required": false,
    "options": [
      {"id": "33333333-3333-4333-8333-333333333301", "posOptionId": null, "name": "Regular", "priceMinor": 0, "isDefault": true},
      {"id": "33333333-3333-4333-8333-333333333302", "posOptionId": null, "name": "Extra hot", "priceMinor": 0, "isDefault": false}
    ]
  }
]
$$
::jsonb,
  sort_order = 10
FROM cafes c
WHERE
  mi.cafe_id = c.id
  AND c.slug = 'clay-and-bean'
  AND mi.name = 'Flat White';

INSERT INTO menu_items (
  cafe_id,
  name,
  description,
  price_minor,
  currency,
  category,
  subcategory,
  tags,
  modifier_groups,
  sort_order
)
SELECT
  c.id,
  'Espresso',
  'Short, intense double.',
  280,
  'GBP',
  'hot_drinks',
  'espresso',
  ARRAY[]::TEXT[],
  '[]'::jsonb,
  15
FROM cafes c
WHERE
  c.slug = 'clay-and-bean'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items x WHERE x.cafe_id = c.id AND x.name = 'Espresso'
  );

INSERT INTO menu_items (
  cafe_id,
  name,
  description,
  price_minor,
  currency,
  category,
  subcategory,
  tags,
  modifier_groups,
  sort_order
)
SELECT
  c.id,
  'Cortado',
  'Double ristretto in equal parts steamed milk.',
  320,
  'GBP',
  'hot_drinks',
  'espresso',
  ARRAY[]::TEXT[],
  $$
[
  {
    "id": "11111111-1111-4111-8111-111111111101",
    "name": "Milk",
    "selectionType": "single",
    "required": false,
    "options": [
      {"id": "22222222-2222-4222-8222-222222222201", "posOptionId": null, "name": "Whole · cow", "priceMinor": 0, "isDefault": true},
      {"id": "22222222-2222-4222-8222-222222222202", "posOptionId": null, "name": "Oat", "priceMinor": 30, "isDefault": false},
      {"id": "22222222-2222-4222-8222-222222222203", "posOptionId": null, "name": "Soy", "priceMinor": 30, "isDefault": false},
      {"id": "22222222-2222-4222-8222-222222222204", "posOptionId": null, "name": "Skim", "priceMinor": 0, "isDefault": false},
      {"id": "22222222-2222-4222-8222-222222222205", "posOptionId": null, "name": "No milk", "priceMinor": 0, "isDefault": false}
    ]
  },
  {
    "id": "11111111-1111-4111-8111-111111111102",
    "name": "Temperature",
    "selectionType": "single",
    "required": false,
    "options": [
      {"id": "33333333-3333-4333-8333-333333333301", "posOptionId": null, "name": "Regular", "priceMinor": 0, "isDefault": true},
      {"id": "33333333-3333-4333-8333-333333333302", "posOptionId": null, "name": "Extra hot", "priceMinor": 0, "isDefault": false}
    ]
  },
  {
    "id": "11111111-1111-4111-8111-111111111103",
    "name": "Extras",
    "selectionType": "multi",
    "required": false,
    "options": [
      {"id": "66666666-6666-4666-8666-666666666601", "posOptionId": null, "name": "Extra shot", "priceMinor": 80, "isDefault": false},
      {"id": "66666666-6666-4666-8666-666666666602", "posOptionId": null, "name": "Decaf", "priceMinor": 0, "isDefault": false}
    ]
  }
]
$$
::jsonb,
  20
FROM cafes c
WHERE
  c.slug = 'clay-and-bean'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items x WHERE x.cafe_id = c.id AND x.name = 'Cortado'
  );

INSERT INTO menu_items (
  cafe_id,
  name,
  description,
  price_minor,
  currency,
  category,
  subcategory,
  tags,
  modifier_groups,
  sort_order
)
SELECT
  c.id,
  'Americano',
  'Double espresso lengthened with hot water.',
  300,
  'GBP',
  'hot_drinks',
  'espresso',
  ARRAY[]::TEXT[],
  $$
[
  {
    "id": "11111111-1111-4111-8111-111111111101",
    "name": "Milk",
    "selectionType": "single",
    "required": false,
    "options": [
      {"id": "22222222-2222-4222-8222-222222222201", "posOptionId": null, "name": "Whole · cow", "priceMinor": 0, "isDefault": true},
      {"id": "22222222-2222-4222-8222-222222222202", "posOptionId": null, "name": "Oat", "priceMinor": 30, "isDefault": false},
      {"id": "22222222-2222-4222-8222-222222222205", "posOptionId": null, "name": "No milk", "priceMinor": 0, "isDefault": false}
    ]
  }
]
$$
::jsonb,
  30
FROM cafes c
WHERE
  c.slug = 'clay-and-bean'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items x WHERE x.cafe_id = c.id AND x.name = 'Americano'
  );

INSERT INTO menu_items (
  cafe_id,
  name,
  description,
  price_minor,
  currency,
  category,
  subcategory,
  tags,
  modifier_groups,
  sort_order
)
SELECT
  c.id,
  'Iced latte',
  'Espresso, milk and ice.',
  380,
  'GBP',
  'cold_drinks',
  'cold',
  ARRAY[]::TEXT[],
  $$
[
  {
    "id": "11111111-1111-4111-8111-111111111101",
    "name": "Milk",
    "selectionType": "single",
    "required": false,
    "options": [
      {"id": "22222222-2222-4222-8222-222222222201", "posOptionId": null, "name": "Whole · cow", "priceMinor": 0, "isDefault": true},
      {"id": "22222222-2222-4222-8222-222222222202", "posOptionId": null, "name": "Oat", "priceMinor": 30, "isDefault": false}
    ]
  }
]
$$
::jsonb,
  40
FROM cafes c
WHERE
  c.slug = 'clay-and-bean'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items x WHERE x.cafe_id = c.id AND x.name = 'Iced latte'
  );

INSERT INTO menu_items (
  cafe_id,
  name,
  description,
  price_minor,
  currency,
  category,
  subcategory,
  tags,
  modifier_groups,
  sort_order
)
SELECT
  c.id,
  'House filter',
  'Batch brew — rotating single origin.',
  320,
  'GBP',
  'hot_drinks',
  'filter',
  ARRAY[]::TEXT[],
  '[]'::jsonb,
  50
FROM cafes c
WHERE
  c.slug = 'clay-and-bean'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items x WHERE x.cafe_id = c.id AND x.name = 'House filter'
  );

INSERT INTO menu_items (
  cafe_id,
  name,
  description,
  price_minor,
  currency,
  category,
  subcategory,
  tags,
  modifier_groups,
  sort_order
)
SELECT
  c.id,
  'English breakfast',
  'Bold black tea — milk optional at pickup.',
  280,
  'GBP',
  'hot_drinks',
  'tea',
  ARRAY[]::TEXT[],
  '[]'::jsonb,
  60
FROM cafes c
WHERE
  c.slug = 'clay-and-bean'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items x WHERE x.cafe_id = c.id AND x.name = 'English breakfast'
  );

INSERT INTO menu_items (
  cafe_id,
  name,
  description,
  price_minor,
  currency,
  category,
  subcategory,
  tags,
  modifier_groups,
  sort_order
)
SELECT
  c.id,
  'Almond croissant',
  'Buttery layers with almond frangipane.',
  280,
  'GBP',
  'food',
  'pastries',
  ARRAY[]::TEXT[],
  $$
[
  {
    "id": "44444444-4444-4444-8444-444444444401",
    "name": "Prep",
    "selectionType": "single",
    "required": false,
    "options": [
      {"id": "55555555-5555-4555-8555-555555555501", "posOptionId": null, "name": "Not warmed", "priceMinor": 0, "isDefault": true},
      {"id": "55555555-5555-4555-8555-555555555502", "posOptionId": null, "name": "Warmed", "priceMinor": 0, "isDefault": false}
    ]
  }
]
$$
::jsonb,
  70
FROM cafes c
WHERE
  c.slug = 'clay-and-bean'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items x WHERE x.cafe_id = c.id AND x.name = 'Almond croissant'
  );

INSERT INTO menu_items (
  cafe_id,
  name,
  description,
  price_minor,
  currency,
  category,
  subcategory,
  tags,
  modifier_groups,
  sort_order
)
SELECT
  c.id,
  'Pain au chocolat',
  'Classic viennoiserie.',
  250,
  'GBP',
  'food',
  'pastries',
  ARRAY[]::TEXT[],
  $$
[
  {
    "id": "44444444-4444-4444-8444-444444444401",
    "name": "Prep",
    "selectionType": "single",
    "required": false,
    "options": [
      {"id": "55555555-5555-4555-8555-555555555501", "posOptionId": null, "name": "Not warmed", "priceMinor": 0, "isDefault": true},
      {"id": "55555555-5555-4555-8555-555555555502", "posOptionId": null, "name": "Warmed", "priceMinor": 0, "isDefault": false}
    ]
  }
]
$$
::jsonb,
  80
FROM cafes c
WHERE
  c.slug = 'clay-and-bean'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items x WHERE x.cafe_id = c.id AND x.name = 'Pain au chocolat'
  );

INSERT INTO menu_items (
  cafe_id,
  name,
  description,
  price_minor,
  currency,
  category,
  subcategory,
  tags,
  modifier_groups,
  sort_order
)
SELECT
  c.id,
  'Oat cookie',
  'Chewy oat and chocolate chip.',
  220,
  'GBP',
  'food',
  'pastries',
  ARRAY[]::TEXT[],
  '[]'::jsonb,
  90
FROM cafes c
WHERE
  c.slug = 'clay-and-bean'
  AND NOT EXISTS (
    SELECT 1 FROM menu_items x WHERE x.cafe_id = c.id AND x.name = 'Oat cookie'
  );
