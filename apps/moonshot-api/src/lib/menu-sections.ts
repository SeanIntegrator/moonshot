import type { CafeMenuSection, MenuSectionKind } from '@moonshot/types';
import {
  SYSTEM_MENU_SECTION_KEYS,
  SYSTEM_MENU_SECTION_LABELS,
  type SystemMenuSectionKey,
} from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import type { Pool, PoolClient } from 'pg';
import { ApiHttpError } from './http-errors.js';
import { syncFoodSectionKeys } from './pos-catalog/menu-catalog-upsert.js';
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
  parent_id: string | null;
  pos_category_id: string | null;
  kind: MenuSectionKind;
  parent_key: string | null;
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
    parentKey: row.parent_key,
    posCategoryId: row.pos_category_id,
    kind: row.kind ?? 'drink',
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
 * Template onboarding only — skips when the café already has POS-synced sections.
 */
export async function ensureSystemMenuSections(
  db: Db,
  cafeId: string,
  opts?: { foodEnabled?: boolean },
): Promise<void> {
  const { rows: posSections } = await db.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM menu_sections
     WHERE cafe_id = $1 AND pos_category_id IS NOT NULL`,
    [cafeId],
  );
  if (Number(posSections[0]?.n ?? 0) > 0) {
    // POS café — registry owned by catalogue sync; do not inject system keys.
    if (opts && 'foodEnabled' in opts && opts.foodEnabled === true) {
      // no-op: food enablement is driven by POS kind
    }
    return;
  }

  const defaults: Array<{ key: SystemMenuSectionKey; enabled: boolean; sortOrder: number }> = [
    { key: 'hot_drinks', enabled: true, sortOrder: 0 },
    { key: 'cold_drinks', enabled: true, sortOrder: 1 },
    { key: 'food', enabled: false, sortOrder: 2 },
  ];

  for (const d of defaults) {
    await db.query(
      `INSERT INTO menu_sections (cafe_id, key, label, enabled, is_system, sort_order, kind)
       VALUES ($1, $2, $3, $4, TRUE, $5, $6)
       ON CONFLICT (cafe_id, key) DO UPDATE SET
         label = EXCLUDED.label,
         is_system = TRUE,
         updated_at = NOW()`,
      [
        cafeId,
        d.key,
        SYSTEM_MENU_SECTION_LABELS[d.key],
        d.enabled,
        d.sortOrder,
        d.key === 'food' ? 'food' : 'drink',
      ],
    );
  }

  if (opts && 'foodEnabled' in opts) {
    await db.query(
      `UPDATE menu_sections SET enabled = $1, kind = 'food', updated_at = NOW()
       WHERE cafe_id = $2 AND key = 'food'`,
      [opts.foodEnabled === true, cafeId],
    );
  }
}

export async function listMenuSectionsForCafe(db: Db, cafeId: string): Promise<CafeMenuSection[]> {
  const { rows } = await db.query<SectionRow>(
    `SELECT s.id, s.cafe_id, s.key, s.label, s.enabled, s.is_system, s.sort_order,
            s.parent_id, s.pos_category_id, s.kind,
            p.key AS parent_key
     FROM menu_sections s
     LEFT JOIN menu_sections p ON p.id = s.parent_id
     WHERE s.cafe_id = $1
     ORDER BY s.sort_order ASC, s.label ASC`,
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

  const kind: MenuSectionKind =
    body.kind === 'food' || body.kind === 'drink'
      ? body.kind
      : label.toLowerCase().includes('food')
        ? 'food'
        : 'drink';

  let parentId: string | null = null;
  if (typeof body.parentKey === 'string' && body.parentKey.trim()) {
    const parent = await db.query<{ id: string }>(
      `SELECT id FROM menu_sections WHERE cafe_id = $1 AND key = $2 LIMIT 1`,
      [cafeId, body.parentKey.trim()],
    );
    if (!parent.rows[0]) {
      throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Unknown parent section');
    }
    parentId = parent.rows[0].id;
  }

  const { rows: maxRows } = await db.query<{ max: number | null }>(
    `SELECT MAX(sort_order) AS max FROM menu_sections WHERE cafe_id = $1`,
    [cafeId],
  );
  const sortOrder = (maxRows[0]?.max ?? 99) + 1;

  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = attempt === 0 ? key : `${key}_${attempt + 1}`;
    try {
      const { rows } = await db.query<SectionRow>(
        `INSERT INTO menu_sections (
           cafe_id, key, label, enabled, is_system, sort_order, parent_id, kind
         ) VALUES ($1, $2, $3, TRUE, FALSE, $4, $5, $6)
         RETURNING id, cafe_id, key, label, enabled, is_system, sort_order,
                   parent_id, pos_category_id, kind, NULL::text AS parent_key`,
        [cafeId, candidate, label, sortOrder, parentId, kind],
      );
      await syncFoodSectionKeys(db as PoolClient, cafeId);
      const created = mapSectionRow(rows[0]!);
      if (parentId) {
        const parentKeyRow = await db.query<{ key: string }>(
          `SELECT key FROM menu_sections WHERE id = $1`,
          [parentId],
        );
        created.parentKey = parentKeyRow.rows[0]?.key ?? null;
      }
      return created;
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
    `SELECT s.id, s.cafe_id, s.key, s.label, s.enabled, s.is_system, s.sort_order,
            s.parent_id, s.pos_category_id, s.kind, p.key AS parent_key
     FROM menu_sections s
     LEFT JOIN menu_sections p ON p.id = s.parent_id
     WHERE s.id = $1 AND s.cafe_id = $2`,
    [sectionId, cafeId],
  );
  if (existing.rows.length === 0) return null;
  const row = existing.rows[0]!;

  let label = row.label;
  let enabled = row.enabled;
  let sortOrder = row.sort_order;
  let kind = row.kind ?? 'drink';

  if ('label' in body && typeof body.label === 'string') {
    const next = body.label.trim();
    if (!next) throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'label cannot be empty');
    label = next;
  }
  if ('enabled' in body && typeof body.enabled === 'boolean') {
    if (body.enabled === false) {
      const { rows: enabledCount } = await db.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM menu_sections
         WHERE cafe_id = $1 AND enabled = TRUE AND id IS DISTINCT FROM $2`,
        [cafeId, sectionId],
      );
      if (Number(enabledCount[0]?.n ?? 0) < 1) {
        throw new ApiHttpError(
          400,
          ApiErrorCode.VALIDATION,
          'At least one menu section must stay enabled',
        );
      }
    }
    enabled = body.enabled;
  }
  if ('sortOrder' in body && typeof body.sortOrder === 'number' && Number.isFinite(body.sortOrder)) {
    sortOrder = Math.round(body.sortOrder);
  }
  if (body.kind === 'food' || body.kind === 'drink') {
    kind = body.kind;
  }

  const { rows } = await db.query<SectionRow>(
    `UPDATE menu_sections
     SET label = $1, enabled = $2, sort_order = $3, kind = $4, updated_at = NOW()
     WHERE id = $5 AND cafe_id = $6
     RETURNING id, cafe_id, key, label, enabled, is_system, sort_order,
               parent_id, pos_category_id, kind, $7::text AS parent_key`,
    [label, enabled, sortOrder, kind, sectionId, cafeId, row.parent_key],
  );
  await syncFoodSectionKeys(db as PoolClient, cafeId);
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
    `SELECT id, cafe_id, key, label, enabled, is_system, sort_order,
            parent_id, pos_category_id, kind, NULL::text AS parent_key
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
  if ((rowCount ?? 0) > 0) {
    await syncFoodSectionKeys(db as PoolClient, cafeId);
  }
  return (rowCount ?? 0) > 0;
}
