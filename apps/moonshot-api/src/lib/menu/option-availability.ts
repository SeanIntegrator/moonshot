import type { NormalisedModifierGroup, NormalisedModifierOption } from '@moonshot/types';
import { availabilityFromOutUntil, optionIsSellable } from '@moonshot/domain';
import type { Pool, PoolClient } from 'pg';

type Db = Pool | PoolClient;

/** option_id → out_until (null = indefinite). Missing key = in stock. */
export type OptionAvailabilityMap = Map<string, Date | null>;

export async function loadOptionAvailabilityMap(db: Db, cafeId: string): Promise<OptionAvailabilityMap> {
  const { rows } = await db.query<{ option_id: string; out_until: Date | null }>(
    `SELECT option_id, out_until FROM modifier_option_availability WHERE cafe_id = $1`,
    [cafeId],
  );
  const map: OptionAvailabilityMap = new Map();
  for (const row of rows) {
    map.set(row.option_id, row.out_until);
  }
  return map;
}

export function overlayOptionAvailability(
  opt: NormalisedModifierOption,
  map: OptionAvailabilityMap,
  now: Date = new Date(),
): NormalisedModifierOption {
  const row = map.has(opt.id) ? map.get(opt.id)! : undefined;
  const availability = availabilityFromOutUntil(row, now);
  return { ...opt, isAvailable: optionIsSellable(availability) };
}

export function overlayGroupAvailability(
  group: NormalisedModifierGroup,
  map: OptionAvailabilityMap,
  now: Date = new Date(),
): NormalisedModifierGroup {
  return {
    ...group,
    options: group.options.map((opt) => overlayOptionAvailability(opt, map, now)),
  };
}

export function outOptionIdsFromMap(map: OptionAvailabilityMap, now: Date = new Date()): string[] {
  const ids: string[] = [];
  for (const [optionId, outUntil] of map) {
    if (!optionIsSellable(availabilityFromOutUntil(outUntil, now))) ids.push(optionId);
  }
  return ids;
}

export async function listOutOptionIds(db: Db, cafeId: string): Promise<string[]> {
  const map = await loadOptionAvailabilityMap(db, cafeId);
  return outOptionIdsFromMap(map);
}

export async function pruneOrphanOptionAvailability(db: Db, cafeId: string): Promise<void> {
  await db.query(
    `DELETE FROM modifier_option_availability a
     WHERE a.cafe_id = $1
       AND NOT EXISTS (
         SELECT 1
         FROM modifier_groups g,
              LATERAL jsonb_array_elements(g.options) AS opt
         WHERE g.cafe_id = a.cafe_id
           AND opt->>'id' = a.option_id::text
       )`,
    [cafeId],
  );
}
