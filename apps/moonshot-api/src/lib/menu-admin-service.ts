import type { NormalisedMenuItem, NormalisedModifierGroup } from '@moonshot/types';
import { ApiErrorCode, isDrinkArchetypeId } from '@moonshot/types';
import type { Pool } from 'pg';
import { ApiHttpError } from './http-errors.js';
import { fetchMenuItemsByIds } from './menu-fetch.js';
import {
  MenuImageValidationError,
  uploadMenuItemThumbnail,
} from './menu-image-storage.js';
import { normalizeSizes, setMenuItemModifierGroups } from './menu-modifier-library.js';
import {
  assertValidMenuSectionKey,
  enableMenuSectionByKey,
  ensureSystemMenuSections,
} from './menu-sections.js';
import { UUID_RE } from './uuid.js';

/** @deprecated Prefer café `menu_sections` — kept for any legacy callers. */
export const MENU_CATEGORIES = ['hot_drinks', 'cold_drinks', 'food', 'extras'] as const;

function parseModifierGroupIds(body: Record<string, unknown>): string[] | undefined {
  if (!('modifierGroupIds' in body)) return undefined;
  if (!Array.isArray(body.modifierGroupIds)) return [];
  return body.modifierGroupIds.filter((id): id is string => typeof id === 'string' && UUID_RE.test(id));
}

function parseArchetype(body: Record<string, unknown>): string | null | undefined {
  if (!('archetype' in body)) return undefined;
  if (body.archetype === null || body.archetype === '') return null;
  if (typeof body.archetype !== 'string' || !isDrinkArchetypeId(body.archetype)) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Invalid drink archetype');
  }
  return body.archetype;
}

function parseWaiveMilk(body: Record<string, unknown>): boolean | undefined {
  if (!('waiveMilkSurcharge' in body)) return undefined;
  if (typeof body.waiveMilkSurcharge !== 'boolean') {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'waiveMilkSurcharge must be a boolean');
  }
  return body.waiveMilkSurcharge;
}

async function loadMergedItem(db: Pool, cafeId: string, itemId: string): Promise<NormalisedMenuItem | null> {
  const map = await fetchMenuItemsByIds(db, cafeId, [itemId]);
  return map.get(itemId) ?? null;
}

export function assertMenuItemId(itemId: string | undefined): string {
  if (!itemId || !UUID_RE.test(itemId)) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'Invalid item id');
  }
  return itemId;
}

export async function createMenuItem(
  db: Pool,
  cafeId: string,
  body: Record<string, unknown>,
): Promise<NormalisedMenuItem> {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const category = typeof body.category === 'string' ? body.category.trim() : '';
  const priceMinor = typeof body.priceMinor === 'number' ? body.priceMinor : Number.NaN;

  if (!name || !category || !Number.isFinite(priceMinor)) {
    throw new ApiHttpError(
      400,
      ApiErrorCode.VALIDATION,
      'name, category (valid menu section), and priceMinor are required',
    );
  }

  await ensureSystemMenuSections(db, cafeId);
  await assertValidMenuSectionKey(db, cafeId, category);

  const description = typeof body.description === 'string' ? body.description : null;
  const currency = typeof body.currency === 'string' ? body.currency : 'GBP';
  const subcategory = typeof body.subcategory === 'string' ? body.subcategory : null;
  const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl : null;
  const emoji = typeof body.emoji === 'string' ? body.emoji : null;
  const posItemId = typeof body.posItemId === 'string' ? body.posItemId : null;
  const tags = Array.isArray(body.tags) ? (body.tags as string[]) : [];
  const modifierGroups = Array.isArray(body.modifierGroups)
    ? (body.modifierGroups as NormalisedModifierGroup[])
    : [];
  const sizes = normalizeSizes(body.sizes);
  const sortOrder = typeof body.sortOrder === 'number' ? body.sortOrder : 0;
  const modifierGroupIds = parseModifierGroupIds(body) ?? [];
  const archetype = parseArchetype(body) ?? null;
  const waiveMilkSurcharge = parseWaiveMilk(body) ?? false;

  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO menu_items (
      cafe_id, pos_item_id, name, description, price_minor, currency, category, subcategory,
      image_url, emoji, is_available, tags, modifier_groups, sizes, sort_order,
      archetype, waive_milk_surcharge
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, $11, $12::jsonb, $13::jsonb, $14, $15, $16)
    RETURNING id`,
    [
      cafeId,
      posItemId,
      name,
      description,
      priceMinor,
      currency,
      category,
      subcategory,
      imageUrl,
      emoji,
      tags,
      JSON.stringify(modifierGroups),
      JSON.stringify(sizes),
      sortOrder,
      archetype,
      waiveMilkSurcharge,
    ],
  );

  const itemId = rows[0]!.id;
  if (modifierGroupIds.length > 0) {
    await setMenuItemModifierGroups(db, itemId, modifierGroupIds);
  }

  // First item in a disabled section (e.g. Food) turns the section on.
  await enableMenuSectionByKey(db, cafeId, category);

  const item = await loadMergedItem(db, cafeId, itemId);
  if (!item) {
    throw new ApiHttpError(500, ApiErrorCode.INTERNAL, 'Menu item created but could not be loaded');
  }
  return item;
}

export async function patchMenuItem(
  db: Pool,
  cafeId: string,
  itemId: string,
  body: Record<string, unknown>,
): Promise<NormalisedMenuItem> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let i = 1;
  const modifierGroupIds = parseModifierGroupIds(body);
  const archetype = parseArchetype(body);
  const waiveMilkSurcharge = parseWaiveMilk(body);

  const optionalString = (key: string, col: string) => {
    if (key in body) {
      const v = body[key];
      sets.push(`${col} = $${i++}`);
      values.push(typeof v === 'string' ? v : v === null ? null : String(v));
    }
  };

  optionalString('name', 'name');
  optionalString('description', 'description');
  optionalString('subcategory', 'subcategory');
  optionalString('imageUrl', 'image_url');
  optionalString('emoji', 'emoji');
  optionalString('currency', 'currency');
  optionalString('posItemId', 'pos_item_id');

  if ('priceMinor' in body && typeof body.priceMinor === 'number') {
    sets.push(`price_minor = $${i++}`);
    values.push(body.priceMinor);
  }
  if ('category' in body && typeof body.category === 'string') {
    await ensureSystemMenuSections(db, cafeId);
    await assertValidMenuSectionKey(db, cafeId, body.category.trim());
    sets.push(`category = $${i++}`);
    values.push(body.category.trim());
  }
  if ('isAvailable' in body && typeof body.isAvailable === 'boolean') {
    sets.push(`is_available = $${i++}`);
    values.push(body.isAvailable);
  }
  if ('tags' in body && Array.isArray(body.tags)) {
    sets.push(`tags = $${i++}`);
    values.push(body.tags);
  }
  if ('modifierGroups' in body && Array.isArray(body.modifierGroups)) {
    sets.push(`modifier_groups = $${i++}::jsonb`);
    values.push(JSON.stringify(body.modifierGroups));
  }
  if ('sizes' in body) {
    sets.push(`sizes = $${i++}::jsonb`);
    values.push(JSON.stringify(normalizeSizes(body.sizes)));
  }
  if ('sortOrder' in body && typeof body.sortOrder === 'number') {
    sets.push(`sort_order = $${i++}`);
    values.push(body.sortOrder);
  }
  if (archetype !== undefined) {
    sets.push(`archetype = $${i++}`);
    values.push(archetype);
  }
  if (waiveMilkSurcharge !== undefined) {
    sets.push(`waive_milk_surcharge = $${i++}`);
    values.push(waiveMilkSurcharge);
  }

  if (sets.length === 0 && modifierGroupIds === undefined) {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'No fields to update');
  }

  if (sets.length > 0) {
    values.push(itemId, cafeId);
    const { rowCount } = await db.query(
      `UPDATE menu_items SET ${sets.join(', ')}
       WHERE id = $${i++} AND cafe_id = $${i++}`,
      values,
    );
    if (rowCount === 0) {
      throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Menu item not found');
    }
  } else {
    const exists = await db.query(`SELECT 1 FROM menu_items WHERE id = $1 AND cafe_id = $2`, [
      itemId,
      cafeId,
    ]);
    if (exists.rows.length === 0) {
      throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Menu item not found');
    }
  }

  if (modifierGroupIds !== undefined) {
    await setMenuItemModifierGroups(db, itemId, modifierGroupIds);
  }

  if ('category' in body && typeof body.category === 'string') {
    await enableMenuSectionByKey(db, cafeId, body.category.trim());
  }

  const item = await loadMergedItem(db, cafeId, itemId);
  if (!item) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Menu item not found');
  }
  return item;
}

export async function uploadMenuItemImage(
  db: Pool,
  cafeId: string,
  itemId: string,
  fileBuffer: Buffer,
): Promise<NormalisedMenuItem> {
  const existing = await db.query<{ image_url: string | null }>(
    `SELECT image_url FROM menu_items WHERE id = $1 AND cafe_id = $2`,
    [itemId, cafeId],
  );
  if (existing.rows.length === 0) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Menu item not found');
  }

  try {
    const imageUrl = await uploadMenuItemThumbnail({
      cafeId,
      itemId,
      fileBuffer,
      previousImageUrl: existing.rows[0]!.image_url,
    });

    await db.query(`UPDATE menu_items SET image_url = $1 WHERE id = $2 AND cafe_id = $3`, [
      imageUrl,
      itemId,
      cafeId,
    ]);
  } catch (e) {
    if (e instanceof MenuImageValidationError) {
      throw new ApiHttpError(e.status, ApiErrorCode.VALIDATION, e.message);
    }
    throw e;
  }

  const item = await loadMergedItem(db, cafeId, itemId);
  if (!item) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Menu item not found');
  }
  return item;
}

/** Soft-hide: sets is_available = false (does not delete rows). */
export async function softHideMenuItem(db: Pool, cafeId: string, itemId: string): Promise<void> {
  const { rowCount } = await db.query(
    `UPDATE menu_items SET is_available = FALSE WHERE id = $1 AND cafe_id = $2`,
    [itemId, cafeId],
  );
  if (rowCount === 0) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Menu item not found');
  }
}
