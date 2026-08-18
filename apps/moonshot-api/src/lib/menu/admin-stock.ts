import type { Pool } from 'pg';
import type { AdminStockOptionPutBody, AdminStockResponse } from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import {
  availabilityFromOutUntil,
  catalogGroupsForPos,
  isPosCatalogCafe,
  nextCafeOpenAt,
} from '@moonshot/domain';
import { findCafeById } from '../cafes-repository.js';
import { ApiHttpError } from '../http-errors.js';
import { getPosConnectionPublicStatus } from '../pos-connections-repository.js';
import { listModifierGroupsForCafe } from './menu-modifier-library.js';
import { listOutOptionIds, loadOptionAvailabilityMap } from './option-availability.js';
import { classifyStockChip } from './stock-chip.js';
import { notifyStockChanged } from './stock-notify.js';

type Db = Pool;

export async function getAdminStock(db: Db, cafeId: string): Promise<AdminStockResponse> {
  const now = new Date();
  const [groups, availMap, usedRows, foodRows, affectedRows, square] = await Promise.all([
    listModifierGroupsForCafe(db, cafeId),
    loadOptionAvailabilityMap(db, cafeId),
    db.query<{ modifier_group_id: string; used_on: string }>(
      `SELECT mimg.modifier_group_id, COUNT(*)::text AS used_on
       FROM menu_item_modifier_groups mimg
       JOIN menu_items mi ON mi.id = mimg.menu_item_id
       JOIN menu_sections ms ON ms.cafe_id = mi.cafe_id AND ms.key = mi.category
       WHERE mi.cafe_id = $1
         AND mi.is_available = TRUE
         AND COALESCE(ms.kind, 'drink') <> 'food'
       GROUP BY mimg.modifier_group_id`,
      [cafeId],
    ),
    db.query<{ id: string; name: string; is_available: boolean }>(
      `SELECT mi.id, mi.name, mi.is_available
       FROM menu_items mi
       JOIN menu_sections ms ON ms.cafe_id = mi.cafe_id AND ms.key = mi.category
       WHERE mi.cafe_id = $1 AND COALESCE(ms.kind, 'drink') = 'food'
       ORDER BY mi.sort_order ASC, mi.name ASC`,
      [cafeId],
    ),
    db.query<{ n: string }>(
      `SELECT COUNT(DISTINCT mi.id)::text AS n
       FROM menu_items mi
       JOIN menu_item_modifier_groups mimg ON mimg.menu_item_id = mi.id
       JOIN modifier_groups mg ON mg.id = mimg.modifier_group_id
       JOIN menu_sections ms ON ms.cafe_id = mi.cafe_id AND ms.key = mi.category
       JOIN modifier_option_availability a ON a.cafe_id = mi.cafe_id
       WHERE mi.cafe_id = $1
         AND mi.is_available = TRUE
         AND COALESCE(ms.kind, 'drink') <> 'food'
         AND (a.out_until IS NULL OR a.out_until > NOW())
         AND EXISTS (
           SELECT 1 FROM jsonb_array_elements(mg.options) opt
           WHERE opt->>'id' = a.option_id::text
         )`,
      [cafeId],
    ),
    getPosConnectionPublicStatus(db, cafeId),
  ]);

  const usedOn = new Map(usedRows.rows.map((r) => [r.modifier_group_id, Number(r.used_on)]));
  const visibleGroups = catalogGroupsForPos(groups, isPosCatalogCafe(square));

  const options = visibleGroups.flatMap((group) => {
    const chip = classifyStockChip(group.name);
    const usedOnCount = usedOn.get(group.id) ?? 0;
    return group.options.map((opt) => {
      const row = availMap.has(opt.id) ? availMap.get(opt.id)! : undefined;
      return {
        optionId: opt.id,
        groupId: group.id,
        groupName: group.name,
        name: opt.name,
        chip,
        availability: availabilityFromOutUntil(row, now),
        usedOnCount,
      };
    });
  });

  return {
    options,
    food: foodRows.rows.map((r) => ({
      itemId: r.id,
      name: r.name,
      availability: r.is_available ? 'in' : 'out',
    })),
    drinksAffectedCount: Number(affectedRows.rows[0]?.n ?? 0),
  };
}

export async function putOptionAvailability(
  db: Db,
  cafeId: string,
  optionId: string,
  body: AdminStockOptionPutBody,
): Promise<AdminStockResponse> {
  const availability = body.availability;
  if (availability !== 'in' && availability !== 'out_today' && availability !== 'out') {
    throw new ApiHttpError(400, ApiErrorCode.VALIDATION, 'availability must be in, out_today, or out');
  }

  const exists = await optionExistsInCafe(db, cafeId, optionId);
  if (!exists) {
    throw new ApiHttpError(404, ApiErrorCode.NOT_FOUND, 'Modifier option not found');
  }

  if (availability === 'in') {
    await db.query(
      `DELETE FROM modifier_option_availability WHERE cafe_id = $1 AND option_id = $2`,
      [cafeId, optionId],
    );
  } else if (availability === 'out') {
    await db.query(
      `INSERT INTO modifier_option_availability (cafe_id, option_id, out_until, set_at)
       VALUES ($1, $2, NULL, NOW())
       ON CONFLICT (cafe_id, option_id)
       DO UPDATE SET out_until = NULL, set_at = NOW()`,
      [cafeId, optionId],
    );
  } else {
    const cafe = await findCafeById(cafeId);
    const nextOpen = cafe ? nextCafeOpenAt(cafe.hours, cafe.timezone) : null;
    if (!nextOpen) {
      throw new ApiHttpError(
        400,
        ApiErrorCode.VALIDATION,
        'Out today needs opening hours so we know when to bring it back',
      );
    }
    await db.query(
      `INSERT INTO modifier_option_availability (cafe_id, option_id, out_until, set_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (cafe_id, option_id)
       DO UPDATE SET out_until = $3, set_at = NOW()`,
      [cafeId, optionId, nextOpen],
    );
  }

  const outOptionIds = await listOutOptionIds(db, cafeId);
  notifyStockChanged({ cafeId, outOptionIds });
  return getAdminStock(db, cafeId);
}

async function optionExistsInCafe(db: Db, cafeId: string, optionId: string): Promise<boolean> {
  const { rows } = await db.query<{ ok: number }>(
    `SELECT 1 AS ok
     FROM modifier_groups g,
          LATERAL jsonb_array_elements(g.options) AS opt
     WHERE g.cafe_id = $1 AND opt->>'id' = $2
     LIMIT 1`,
    [cafeId, optionId],
  );
  return rows.length > 0;
}