-- Unique (cafe_id, name) so ensureFlowPrepModifierGroups can use ON CONFLICT
-- and concurrent onboarding cannot insert duplicate group names.

-- Prefer the oldest row when duplicates already exist; re-point join rows, then drop extras.
WITH ranked AS (
  SELECT
    id,
    cafe_id,
    name,
    ROW_NUMBER() OVER (PARTITION BY cafe_id, name ORDER BY created_at ASC, id ASC) AS rn
  FROM modifier_groups
),
dupes AS (
  SELECT r.id AS dupe_id, keep.id AS keep_id
  FROM ranked r
  JOIN ranked keep
    ON keep.cafe_id = r.cafe_id
   AND keep.name = r.name
   AND keep.rn = 1
  WHERE r.rn > 1
),
repoint AS (
  UPDATE menu_item_modifier_groups mig
  SET modifier_group_id = d.keep_id
  FROM dupes d
  WHERE mig.modifier_group_id = d.dupe_id
    AND NOT EXISTS (
      SELECT 1
      FROM menu_item_modifier_groups x
      WHERE x.menu_item_id = mig.menu_item_id
        AND x.modifier_group_id = d.keep_id
    )
  RETURNING mig.menu_item_id
)
DELETE FROM menu_item_modifier_groups mig
USING dupes d
WHERE mig.modifier_group_id = d.dupe_id;

DELETE FROM modifier_groups mg
USING (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY cafe_id, name ORDER BY created_at ASC, id ASC) AS rn
  FROM modifier_groups
) ranked
WHERE mg.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS modifier_groups_cafe_name_unique
  ON modifier_groups (cafe_id, name);
