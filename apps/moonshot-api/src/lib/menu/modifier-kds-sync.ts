import type { ModifierSlot } from '@moonshot/types';
import { kdsClassificationFieldForSlot } from '@moonshot/domain';
import type { Pool, PoolClient } from 'pg';

type Db = Pool | PoolClient;

/** Merge a group name into the KDS bucket for its slot (Moonshot-owned metadata). */
export async function syncKdsClassificationForGroup(
  db: Db,
  cafeId: string,
  groupName: string,
  slot: ModifierSlot,
): Promise<void> {
  const field = kdsClassificationFieldForSlot(slot);
  if (!field || !groupName.trim()) return;

  const { rows } = await db.query<{ kds_config: Record<string, unknown> }>(
    `SELECT kds_config FROM cafes WHERE id = $1`,
    [cafeId],
  );
  const kds = { ...(rows[0]?.kds_config ?? {}) } as Record<string, unknown>;
  const mc = {
    ...((kds.modifierClassification as Record<string, unknown> | undefined) ?? {}),
  };
  const existing = mc[field];
  const base = Array.isArray(existing)
    ? existing.filter((x): x is string => typeof x === 'string')
    : [];
  mc[field] = [...new Set([...base, groupName.trim()])];
  kds.modifierClassification = mc;
  await db.query(`UPDATE cafes SET kds_config = $1::jsonb WHERE id = $2`, [
    JSON.stringify(kds),
    cafeId,
  ]);
}
