import type { CafeModifierGroup, NormalisedItemSize, NormalisedModifierGroup } from '@moonshot/types';
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { mapModifierGroupRow, type ModifierGroupRow } from './menu-map.js';

type Db = Pool | PoolClient;

function parseOptions(raw: unknown): NormalisedModifierGroup['options'] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((o): o is Record<string, unknown> => o != null && typeof o === 'object')
    .map((o) => ({
      id: typeof o.id === 'string' && o.id ? o.id : randomUUID(),
      posOptionId: typeof o.posOptionId === 'string' ? o.posOptionId : null,
      name: String(o.name ?? '').trim(),
      priceMinor: typeof o.priceMinor === 'number' ? Math.max(0, Math.round(o.priceMinor)) : 0,
      isDefault: o.isDefault === true,
      colorHex: typeof o.colorHex === 'string' ? o.colorHex : null,
      chipLabel: typeof o.chipLabel === 'string' ? o.chipLabel : null,
      isAvailable: true,
    }))
    .filter((o) => o.name.length > 0);
}

function normalizeSizes(raw: unknown): NormalisedItemSize[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is Record<string, unknown> => s != null && typeof s === 'object')
    .map((s) => ({
      id: typeof s.id === 'string' && s.id ? s.id : randomUUID(),
      name: String(s.name ?? '').trim(),
      priceMinor: typeof s.priceMinor === 'number' ? Math.max(0, Math.round(s.priceMinor)) : 0,
      isDefault: s.isDefault === true,
      colorHex: typeof s.colorHex === 'string' ? s.colorHex : null,
      chipLabel: typeof s.chipLabel === 'string' ? s.chipLabel : null,
    }))
    .filter((s) => s.name.length > 0);
}

function toCafeModifierGroup(row: ModifierGroupRow): CafeModifierGroup {
  return {
    ...mapModifierGroupRow(row),
    sortOrder: row.sort_order,
    posGroupId: row.pos_group_id ?? null,
  };
}

export async function listModifierGroupsForCafe(db: Db, cafeId: string): Promise<CafeModifierGroup[]> {
  const { rows } = await db.query<ModifierGroupRow>(
    `SELECT id, name, selection_type, required, max_select, options, sort_order, pos_group_id
     FROM modifier_groups
     WHERE cafe_id = $1
     ORDER BY sort_order ASC, name ASC`,
    [cafeId],
  );
  return rows.map(toCafeModifierGroup);
}

export async function createModifierGroup(
  db: Db,
  cafeId: string,
  body: Record<string, unknown>,
): Promise<CafeModifierGroup> {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) throw new Error('name is required');

  const selectionType = body.selectionType === 'multi' ? 'multi' : 'single';
  const required = body.required === true;
  const maxSelect =
    typeof body.maxSelect === 'number' && body.maxSelect > 0 ? Math.round(body.maxSelect) : null;
  const options = parseOptions(body.options);
  const sortOrder = typeof body.sortOrder === 'number' ? body.sortOrder : 0;

  const { rows } = await db.query<ModifierGroupRow>(
    `INSERT INTO modifier_groups (cafe_id, name, selection_type, required, max_select, options, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
     RETURNING id, name, selection_type, required, max_select, options, sort_order, pos_group_id`,
    [cafeId, name, selectionType, required, maxSelect, JSON.stringify(options), sortOrder],
  );
  const row = rows[0]!;
  return toCafeModifierGroup(row);
}

export async function updateModifierGroup(
  db: Db,
  cafeId: string,
  groupId: string,
  body: Record<string, unknown>,
): Promise<CafeModifierGroup | null> {
  const sets: string[] = ['updated_at = NOW()'];
  const values: unknown[] = [];
  let i = 1;

  if (typeof body.name === 'string') {
    sets.push(`name = $${i++}`);
    values.push(body.name.trim());
  }
  if (body.selectionType === 'single' || body.selectionType === 'multi') {
    sets.push(`selection_type = $${i++}`);
    values.push(body.selectionType);
  }
  if (typeof body.required === 'boolean') {
    sets.push(`required = $${i++}`);
    values.push(body.required);
  }
  if ('maxSelect' in body) {
    sets.push(`max_select = $${i++}`);
    values.push(
      typeof body.maxSelect === 'number' && body.maxSelect > 0 ? Math.round(body.maxSelect) : null,
    );
  }
  if ('options' in body && Array.isArray(body.options)) {
    sets.push(`options = $${i++}::jsonb`);
    values.push(JSON.stringify(parseOptions(body.options)));
  }
  if (typeof body.sortOrder === 'number') {
    sets.push(`sort_order = $${i++}`);
    values.push(body.sortOrder);
  }

  values.push(groupId, cafeId);
  const { rows } = await db.query<ModifierGroupRow>(
    `UPDATE modifier_groups SET ${sets.join(', ')}
     WHERE id = $${i++} AND cafe_id = $${i++}
     RETURNING id, name, selection_type, required, max_select, options, sort_order, pos_group_id`,
    values,
  );
  const row = rows[0];
  if (!row) return null;
  return toCafeModifierGroup(row);
}

export async function deleteModifierGroup(db: Db, cafeId: string, groupId: string): Promise<boolean> {
  const { rowCount } = await db.query(
    `DELETE FROM modifier_groups WHERE id = $1 AND cafe_id = $2`,
    [groupId, cafeId],
  );
  return (rowCount ?? 0) > 0;
}

export async function setMenuItemModifierGroups(
  db: Db,
  menuItemId: string,
  groupIds: string[],
): Promise<void> {
  await db.query(`DELETE FROM menu_item_modifier_groups WHERE menu_item_id = $1`, [menuItemId]);
  for (let idx = 0; idx < groupIds.length; idx++) {
    await db.query(
      `INSERT INTO menu_item_modifier_groups (menu_item_id, modifier_group_id, sort_order)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [menuItemId, groupIds[idx], idx],
    );
  }
}

export { normalizeSizes };
