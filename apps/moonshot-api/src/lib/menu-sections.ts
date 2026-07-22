import type { CafeMenuSection } from '@moonshot/types';
import {
  SYSTEM_MENU_SECTION_KEYS,
  SYSTEM_MENU_SECTION_LABELS,
  type SystemMenuSectionKey,
} from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import type { Pool, PoolClient } from 'pg';
import { ApiHttpError } from './http-errors.js';
import { UUID_RE } from './uuid.js';

type Db = Pool | PoolClient;

type SectionRow = {
  id: string;
  cafe_id: string;
  key: string;
  label: string;
  enabled: boolean;
  is_system: boolean;
  sort_order: number;
};

function mapSectionRow(row: SectionRow): CafeMenuSection {
  return {
    id: row.id,
    cafeId: row.cafe_id,
    key: row.key,
    label: row.label,
    enabled: row.enabled,
    isSystem: row.is_system,
    sortOrder: row.sort_order,
  };
}

/** Slugify a display label into a stable section key. */
export function slugifyMenuSectionKey(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  return slug || 'section';
}

/**
 * Ensure hot_drinks / cold_drinks / food exist for a café.
 * Inserts missing system rows; optionally syncs `food.enabled` when `foodEnabled` is set.
 */
export async function ensureSystemMenuSections(
  db: Db,
  cafeId: string,
  opts?: { foodEnabled?: boolean },
): Promise<void> {
  const defaults: Array<{ key: SystemMenuSectionKey; enabled: boolean; sortOrder: number }> = [
    { key: 'hot_drinks', enabled: true, sortOrder: 0 },
    { key: 'cold_drinks', enabled: true, sortOrder: 1 },
    { key: 'food', enabled: false, sortOrder: 2 },
  ];

  for (const d of defaults) {
    await db.query(
      `INSERT INTO menu_sections (cafe_id, key, label, enabled, is_system, sort_order)
       VALUES ($1, $2, $3, $4, TRUE, $5)
       ON CONFLICT (cafe_id, key) DO UPDATE SET
         label = EXCLUDED.label,
         is_system = TRUE,
         updated_at = NOW()`,
      [cafeId, d.key, SYSTEM_MENU_SECTION_LABELS[d.key], d.enabled, d.sortOrder],
    );
  }

  if (opts && 'foodEnabled' in opts) {
    await db.query(
      `UPDATE menu_sections SET enabled = $1, updated_at = NOW()
       WHERE cafe_id = $2 AND key = 'food'`,
      [opts.foodEnabled === true, cafeId],
    );
  }
}

export async function listMenuSectionsForCafe(db: Db, cafeId: string): Promise<CafeMenuSection[]> {
  const { rows } = await db.query<SectionRow>(
    `SELECT id, cafe_id, key, label, enabled, is_system, sort_order
     FROM menu_sections
     WHERE cafe_id = $1
     ORDER BY sort_order ASC, label ASC`,
    [cafeId],
  );
  return rows.map(mapSectionRow);
}

export async function assertValidMenuSectionKey(
  db: Db,
  cafeId: string,
  categoryKey: string,
): Promise<void> {
  const key = categoryKey.trim();
  if (!key) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'category is required');
  }
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM menu_sections WHERE cafe_id = $1 AND key = $2`,
    [cafeId, key],
  );
  if (rows.length === 0) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, `Unknown menu section: ${key}`);
  }
}

/** Enable a section by key (e.g. when the first food item is created). */
export async function enableMenuSectionByKey(db: Db, cafeId: string, key: string): Promise<void> {
  await db.query(
    `UPDATE menu_sections SET enabled = TRUE, updated_at = NOW()
     WHERE cafe_id = $1 AND key = $2 AND enabled = FALSE`,
    [cafeId, key],
  );
}

export async function createMenuSection(
  db: Db,
  cafeId: string,
  body: Record<string, unknown>,
): Promise<CafeMenuSection> {
  const label = typeof body.label === 'string' ? body.label.trim() : '';
  if (!label) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'label is required');
  }

  let key =
    typeof body.key === 'string' && body.key.trim()
      ? slugifyMenuSectionKey(body.key)
      : slugifyMenuSectionKey(label);

  if ((SYSTEM_MENU_SECTION_KEYS as readonly string[]).includes(key)) {
    throw new ApiHttpError(
      400,
      ApiErrorCode.VALIDATION,
      `“${key}” is a built-in section — enable it instead of creating a duplicate`,
    );
  }

  const { rows: maxRows } = await db.query<{ max: number | null }>(
    `SELECT MAX(sort_order) AS max FROM menu_sections WHERE cafe_id = $1`,
    [cafeId],
  );
  const sortOrder = (maxRows[0]?.max ?? 99) + 1;

  // Avoid unique conflicts by suffixing.
  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = attempt === 0 ? key : `${key}_${attempt + 1}`;
    try {
      const { rows } = await db.query<SectionRow>(
        `INSERT INTO menu_sections (cafe_id, key, label, enabled, is_system, sort_order)
         VALUES ($1, $2, $3, TRUE, FALSE, $4)
         RETURNING id, cafe_id, key, label, enabled, is_system, sort_order`,
        [cafeId, candidate, label, sortOrder],
      );
      return mapSectionRow(rows[0]!);
    } catch (e) {
      const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '';
      if (code !== '23505') throw e;
    }
  }

  throw new ApiHttpError(409, ApiErrorCode.CONFLICT, 'Could not allocate a unique section key');
}

export async function updateMenuSection(
  db: Db,
  cafeId: string,
  sectionId: string,
  body: Record<string, unknown>,
): Promise<CafeMenuSection | null> {
  if (!UUID_RE.test(sectionId)) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Invalid section id');
  }

  const existing = await db.query<SectionRow>(
    `SELECT id, cafe_id, key, label, enabled, is_system, sort_order
     FROM menu_sections WHERE id = $1 AND cafe_id = $2`,
    [sectionId, cafeId],
  );
  if (existing.rows.length === 0) return null;
  const row = existing.rows[0]!;

  let label = row.label;
  let enabled = row.enabled;
  let sortOrder = row.sort_order;

  if ('label' in body && typeof body.label === 'string') {
    const next = body.label.trim();
    if (!next) throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'label cannot be empty');
    // System keys keep stable keys; label can still be edited for display.
    label = next;
  }
  if ('enabled' in body && typeof body.enabled === 'boolean') {
    if (row.key === 'hot_drinks' && body.enabled === false) {
      throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'hot_drinks cannot be disabled');
    }
    enabled = body.enabled;
  }
  if ('sortOrder' in body && typeof body.sortOrder === 'number' && Number.isFinite(body.sortOrder)) {
    sortOrder = Math.round(body.sortOrder);
  }

  const { rows } = await db.query<SectionRow>(
    `UPDATE menu_sections
     SET label = $1, enabled = $2, sort_order = $3, updated_at = NOW()
     WHERE id = $4 AND cafe_id = $5
     RETURNING id, cafe_id, key, label, enabled, is_system, sort_order`,
    [label, enabled, sortOrder, sectionId, cafeId],
  );
  return rows[0] ? mapSectionRow(rows[0]) : null;
}

export async function deleteMenuSection(
  db: Db,
  cafeId: string,
  sectionId: string,
): Promise<boolean> {
  if (!UUID_RE.test(sectionId)) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Invalid section id');
  }

  const existing = await db.query<SectionRow>(
    `SELECT id, cafe_id, key, label, enabled, is_system, sort_order
     FROM menu_sections WHERE id = $1 AND cafe_id = $2`,
    [sectionId, cafeId],
  );
  if (existing.rows.length === 0) return false;
  const row = existing.rows[0]!;

  if (row.is_system) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Built-in sections cannot be deleted');
  }

  const inUse = await db.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM menu_items WHERE cafe_id = $1 AND category = $2`,
    [cafeId, row.key],
  );
  if (Number(inUse.rows[0]?.n ?? 0) > 0) {
    throw new ApiHttpError(
      409,
      ApiErrorCode.CONFLICT,
      'Section still has menu items — move or delete them first',
    );
  }

  const { rowCount } = await db.query(`DELETE FROM menu_sections WHERE id = $1 AND cafe_id = $2`, [
    sectionId,
    cafeId,
  ]);
  return (rowCount ?? 0) > 0;
}
