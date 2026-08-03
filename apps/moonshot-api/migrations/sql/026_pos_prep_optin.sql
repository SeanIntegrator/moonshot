-- Strip auto-attached Moonshot Flow prep groups from Square-connected cafés.
-- Prep groups remain in the modifier library for admin re-opt-in via drink types.

-- Detach Moonshot-only prep groups from POS-linked items.
DELETE FROM menu_item_modifier_groups mig
USING menu_items mi, modifier_groups mg, pos_connections pc
WHERE mig.menu_item_id = mi.id
  AND mig.modifier_group_id = mg.id
  AND pc.cafe_id = mi.cafe_id
  AND pc.provider = 'square'
  AND pc.status IN ('active', 'needs_reauth')
  AND mi.pos_item_id IS NOT NULL
  AND mg.pos_group_id IS NULL
  AND mg.name IN (
    'Shots',
    'Beans',
    'Milk Temperature',
    'Milk Texture',
    'Ice Level',
    'Toppings'
  );

-- Clear auto-inferred archetype flags on POS-linked items (admin re-assigns deliberately).
UPDATE menu_items mi
SET
  archetype = NULL,
  waive_milk_surcharge = FALSE,
  allow_no_milk = FALSE
FROM pos_connections pc
WHERE pc.cafe_id = mi.cafe_id
  AND pc.provider = 'square'
  AND pc.status IN ('active', 'needs_reauth')
  AND mi.pos_item_id IS NOT NULL;
