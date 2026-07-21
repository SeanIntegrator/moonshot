-- Seed default KDS modifier classification for cafés with empty lists.
-- coffeeModifiers = milk groups (square chips); additions = syrups/extras (round).

UPDATE cafes
SET
  kds_config = jsonb_set(
    jsonb_set(
      kds_config,
      '{modifierClassification,coffeeModifiers}',
      '["Milks","Milk"]'::jsonb,
      TRUE
    ),
    '{modifierClassification,additions}',
    '["Syrups","Extras"]'::jsonb,
    TRUE
  )
WHERE
  COALESCE(jsonb_array_length(kds_config -> 'modifierClassification' -> 'coffeeModifiers'), 0) = 0
  AND COALESCE(jsonb_array_length(kds_config -> 'modifierClassification' -> 'additions'), 0) = 0;
