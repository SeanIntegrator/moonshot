-- Phase 11 - add multi-select syrup modifiers to seeded coffee items.

WITH syrup_group AS (
  SELECT
    '11111111-1111-4111-8111-111111111104'::text AS group_id,
    $$
[
  {
    "id": "11111111-1111-4111-8111-111111111104",
    "name": "Syrups",
    "selectionType": "multi",
    "required": false,
    "options": [
      {"id": "77777777-7777-4777-8777-777777777701", "posOptionId": null, "name": "Strawberry", "priceMinor": 50, "isDefault": false},
      {"id": "77777777-7777-4777-8777-777777777702", "posOptionId": null, "name": "Caramel", "priceMinor": 50, "isDefault": false},
      {"id": "77777777-7777-4777-8777-777777777703", "posOptionId": null, "name": "Vanilla", "priceMinor": 50, "isDefault": false},
      {"id": "77777777-7777-4777-8777-777777777704", "posOptionId": null, "name": "Hazelnut", "priceMinor": 50, "isDefault": false},
      {"id": "77777777-7777-4777-8777-777777777705", "posOptionId": null, "name": "Cinnamon", "priceMinor": 50, "isDefault": false},
      {"id": "77777777-7777-4777-8777-777777777706", "posOptionId": null, "name": "Pumpkin spice", "priceMinor": 50, "isDefault": false},
      {"id": "77777777-7777-4777-8777-777777777707", "posOptionId": null, "name": "Sugar free vanilla", "priceMinor": 50, "isDefault": false},
      {"id": "77777777-7777-4777-8777-777777777708", "posOptionId": null, "name": "Salted caramel", "priceMinor": 50, "isDefault": false},
      {"id": "77777777-7777-4777-8777-777777777709", "posOptionId": null, "name": "Chocolate", "priceMinor": 50, "isDefault": false}
    ]
  }
]
$$::jsonb AS group_json
)
UPDATE menu_items mi
SET modifier_groups = COALESCE(mi.modifier_groups, '[]'::jsonb) || syrup_group.group_json
FROM cafes c, syrup_group
WHERE
  mi.cafe_id = c.id
  AND c.slug = 'clay-and-bean'
  AND mi.name IN ('Flat White', 'Cortado', 'Iced latte')
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(mi.modifier_groups, '[]'::jsonb)) AS modifier_group
    WHERE modifier_group->>'id' = syrup_group.group_id
  );
