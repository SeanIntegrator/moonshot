-- Backfill kds_config.audio keys added for the KDS chime / overdue alarm.
-- Existing volume is preserved. Placeholder newOrderSound:null becomes 'chime'
-- because that null was never a café choice (no sound picker existed).

UPDATE cafes
SET kds_config = jsonb_set(
  kds_config,
  '{audio}',
  jsonb_build_object(
    'enabled',
    COALESCE((kds_config#>>'{audio,enabled}')::boolean, true),
    'newOrderSound',
    CASE
      WHEN kds_config#>'{audio,newOrderSound}' IS NULL
        OR kds_config#>'{audio,newOrderSound}' = 'null'::jsonb
      THEN '"chime"'::jsonb
      ELSE kds_config#>'{audio,newOrderSound}'
    END,
    'overdueSound',
    CASE
      WHEN kds_config#>'{audio,overdueSound}' IS NULL
        OR kds_config#>'{audio,overdueSound}' = 'null'::jsonb
      THEN '"knock"'::jsonb
      ELSE kds_config#>'{audio,overdueSound}'
    END,
    'overdueRepeatSeconds',
    COALESCE((kds_config#>>'{audio,overdueRepeatSeconds}')::int, 60),
    'volume',
    COALESCE((kds_config#>>'{audio,volume}')::int, 80)
  )
);
